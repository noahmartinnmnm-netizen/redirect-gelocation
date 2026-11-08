(function initEceAutoRedirect(root) {
  const CRAWLER =
    /bot|spider|crawl|slurp|curl|wget|python-requests|headless|googlebot|bingbot|baiduspider|yandex|duckduckbot|facebookexternal|embedly|pinterest|quora|redditbot|applebot|whatsapp|telegrambot|slackbot|discordbot|linkedinbot|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|amazonbot|ia_archiver|qwantify|bitlybot|nuzzel|flipboard|tumblr|skypeuripreview|w3c_validator|chrome-lighthouse|google-inspectiontool|go-http-client|java\/|libwww-perl|httpclient|scrapy|phantomjs/i;

  const plan = {
    compileDestinationMap,
    alreadyOnDestination,
    stripRoutingPrefixes,
    buildRuleUrl,
    urlPatternMatches,
    passesUrlGates,
    ipMatches,
    isCrawler,
    cooldownActive,
    cooldownMinutes,
    hasSkipFlag,
    marketsRoutingOn,
    getGeoRedirectPlan,
    precheck,
    normalizeCountry,
  };

  root.EceAutoRedirectPlan = plan;

  if (typeof document === "undefined") return;

  root.clearEceAutoRedirectSession = clearSession;
  root.clearAutoRedirectSession = clearSession;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  function start() {
    run().catch(function failOpen() {
      root.__eceAutoRedirectInProgress = false;
    });
  }

  async function run() {
    const config = readConfig();
    if (!config) return;
    mountCustomHtml(config.customHtml);

    const currentUrl = window.location.href;
    const gate = plan.precheck({
      search: window.location.search,
      designMode: Boolean(config.designMode) || inDesignMode(),
      currentUrl,
      whitelistedUrls: stringList(config.whitelistedUrls),
      reverseWhitelistedUrls: stringList(config.reverseWhitelistedUrls),
      enabled: Boolean(config.redirectOnlyOnce),
      minutes: config.cooldownMinutes,
      now: Date.now(),
      cookie: readCookie(onceCookieName(config.shop)),
      storage: readStorage(config.shop),
      inFlight: Boolean(root.__eceAutoRedirectInProgress),
    });
    if (gate.stop) return;

    root.__eceAutoRedirectInProgress = true;
    const ips = stringList(config.whitelistedIps);
    const visitor = await detectVisitor(ips.length > 0);
    const decision = plan.getGeoRedirectPlan({
      country: visitor.country,
      ip: visitor.ip,
      whitelistedIps: ips,
      destinations: plan.compileDestinationMap(config.rules),
      currentUrl,
      marketsOn: plan.marketsRoutingOn(config.marketsRouting),
      currentMarketCountries: stringList(config.currentMarketCountries),
      formCountry: config.formCountry,
      availableCountries: stringList(config.availableCountries),
      preserveRelativePath: Boolean(config.preserveRelativePath),
      localeRoot: config.localeRoot,
      basePaths: stringList(config.basePaths),
    });

    if (decision.action === "stop") {
      root.__eceAutoRedirectInProgress = false;
      return;
    }

    if (plan.isCrawler(window.navigator.userAgent)) {
      showModal(decision, config);
      return;
    }

    go(decision, config);
  }

  function go(decision, config) {
    if (config.redirectOnlyOnce) {
      markOnce(config.shop, config.cooldownMinutes);
    }
    if (decision.action === "rule") {
      if (!decision.url) {
        root.__eceAutoRedirectInProgress = false;
        return;
      }
      window.location.assign(decision.url);
      return;
    }
    if (decision.action === "market") {
      submitMarket(decision);
      return;
    }
    root.__eceAutoRedirectInProgress = false;
  }

  function submitMarket(decision) {
    const form = document.querySelector("ece-auto-redirect-form form");
    if (!form) {
      root.__eceAutoRedirectInProgress = false;
      return;
    }
    const country = form.querySelector('input[name="country_code"]');
    const returnTo = form.querySelector('input[name="return_to"]');
    if (country) country.value = decision.country;
    if (returnTo) returnTo.value = decision.returnTo;
    form.querySelectorAll("[data-ece-utm]").forEach(function removeUtm(node) {
      node.remove();
    });
    const params = new URLSearchParams(window.location.search);
    params.forEach(function addUtm(value, key) {
      if (!key.toLowerCase().startsWith("utm_")) return;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      input.setAttribute("data-ece-utm", "true");
      form.appendChild(input);
    });
    form.submit();
  }

  function showModal(decision, config) {
    const overlay = document.createElement("div");
    overlay.className = "ece-auto-redirect-modal";
    const dialog = document.createElement("div");
    dialog.className = "ece-auto-redirect-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "ece-auto-redirect-title");

    const title = document.createElement("h2");
    title.id = "ece-auto-redirect-title";
    title.textContent = config.modalTitle || "Continue to your local store?";

    const actions = document.createElement("div");
    actions.className = "ece-auto-redirect-actions";
    const stay = document.createElement("button");
    stay.type = "button";
    stay.textContent = config.modalStay || "Stay here";
    const yes = document.createElement("button");
    yes.type = "button";
    yes.textContent = config.modalYes || "Yes, take me there";

    function closeModal() {
      overlay.remove();
    }

    stay.addEventListener("click", closeModal);
    yes.addEventListener("click", function confirmRedirect() {
      closeModal();
      go(decision, config);
    });
    overlay.addEventListener("keydown", function onKey(event) {
      if (event.key === "Escape") closeModal();
    });

    actions.append(stay, yes);
    dialog.append(title, actions);
    overlay.append(dialog);
    document.body.append(overlay);
    yes.focus();
  }

  function mountCustomHtml(html) {
    const host = document.getElementById("ece-auto-redirect-custom-html");
    if (!host || !html) return;
    host.innerHTML = String(html);
    host.hidden = false;
    host.querySelectorAll("script").forEach(function rerun(oldScript) {
      if (oldScript.src) return;
      const code = oldScript.textContent || "";
      if (!code.trim()) return;
      try {
        const execute = new Function(code);
        execute();
      } catch (error) {
        /* A merchant script must not block the redirect decision. */
      }
    });
  }

  function readConfig() {
    const node = document.getElementById("ece-auto-redirect-config");
    if (!node) return null;
    try {
      const parsed = JSON.parse(node.textContent || "");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  async function detectVisitor(needsIp) {
    let country = "";
    let ip = "";
    try {
      const data = await fetchJson(suggestionsUrl(), "same-origin");
      const detected = data && data.detected_values && data.detected_values.country;
      country = plan.normalizeCountry(detected && detected.handle);
    } catch (error) {
      country = "";
    }

    if (!country || (needsIp && !ip)) {
      try {
        const data = await fetchJson("https://api.country.is/", "omit");
        if (!country) country = plan.normalizeCountry(data && data.country);
        ip = String((data && (data.ip || data.visitor_ip || (data.data && data.data.ip))) || "");
      } catch (error) {
        /* No country means the plan stops. A missing IP does not match the IP whitelist. */
      }
    }

    return { country, ip };
  }

  function suggestionsUrl() {
    const routes = window.Shopify && window.Shopify.routes;
    const rootUrl = (routes && routes.root) || "/";
    const normalized = rootUrl.endsWith("/") ? rootUrl : `${rootUrl}/`;
    return `${normalized}browsing_context_suggestions.json?country[enabled]=true`;
  }

  async function fetchJson(url, credentials) {
    const timeout =
      window.AbortSignal && typeof window.AbortSignal.timeout === "function"
        ? window.AbortSignal.timeout(4000)
        : undefined;
    const response = await window.fetch(url, { credentials, signal: timeout });
    if (!response.ok) return null;
    return response.json();
  }

  function inDesignMode() {
    try {
      if (window.Shopify && window.Shopify.designMode) return true;
    } catch (error) {
      /* designMode can throw in a locked frame */
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "editor" || params.has("_fd")) return true;
    try {
      if (
        window.parent &&
        window.parent !== window &&
        window.parent.Shopify &&
        window.parent.Shopify.designMode
      ) {
        return true;
      }
    } catch (error) {
      /* The parent frame is cross-origin. */
    }
    return false;
  }

  function markOnce(shop, minutes) {
    const now = Date.now();
    const maxAge = plan.cooldownMinutes(minutes) * 60;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${onceCookieName(shop)}=${now}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
    try {
      window.localStorage.setItem(onceStorageKey(shop), String(now));
    } catch (error) {
      /* Storage can be blocked. The cookie still records the cooldown. */
    }
  }

  function clearSession() {
    root.__eceAutoRedirectInProgress = false;
    const config = readConfig() || {};
    const shop = config.shop || "";
    document.cookie = `${onceCookieName(shop)}=; Max-Age=0; Path=/; SameSite=Lax`;
    try {
      window.localStorage.removeItem(onceStorageKey(shop));
    } catch (error) {
      /* Storage can be blocked. The cookie clear is enough for the next check. */
    }
  }

  function onceCookieName(shop) {
    return `ece_ar_once_${sanitizeShop(shop)}`;
  }

  function onceStorageKey(shop) {
    return `ece_auto_redirect_once:${shop || ""}`;
  }

  function readCookie(name) {
    const prefix = `${name}=`;
    const parts = document.cookie ? document.cookie.split("; ") : [];
    for (let index = 0; index < parts.length; index += 1) {
      if (parts[index].startsWith(prefix)) {
        return decodeURIComponent(parts[index].slice(prefix.length));
      }
    }
    return "";
  }

  function readStorage(shop) {
    try {
      return window.localStorage.getItem(onceStorageKey(shop)) || "";
    } catch (error) {
      return "";
    }
  }

  function stringList(value) {
    if (Array.isArray(value)) {
      return value.map(function toText(item) {
        return String(item ?? "").trim();
      }).filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      try {
        return stringList(JSON.parse(value));
      } catch (error) {
        return value.split(",").map(function trimCode(item) {
          return item.trim();
        }).filter(Boolean);
      }
    }
    return [];
  }

  function sanitizeShop(shop) {
    return String(shop || "").replace(/[^A-Za-z0-9-]/g, "_");
  }

  function normalizeCountry(value) {
    const code = String(value ?? "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : "";
  }

  function marketsRoutingOn(value) {
    const text = String(value ?? "").trim().toLowerCase();
    if (!text || text === "null") return true;
    if (text === "off" || text === "0" || text === "false") return false;
    return !/pinstamarket["']?\s*:\s*0/.test(text);
  }

  function compileDestinationMap(value) {
    const map = {};
    absorb(value, map);
    return map;
  }

  function absorb(value, map) {
    if (value == null) return;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return;
      try {
        absorb(JSON.parse(trimmed), map);
        return;
      } catch (error) {
        parseLooseMap(trimmed, map);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function addEntry(entry) {
        addRuleEntry(entry, map);
      });
      return;
    }
    if (typeof value !== "object") return;
    if (Array.isArray(value.rules)) {
      value.rules.forEach(function addStored(entry) {
        addRuleEntry(entry, map);
      });
      return;
    }
    Object.keys(value).forEach(function addPair(key) {
      setDestination(map, key, value[key]);
    });
  }

  function parseLooseMap(text, map) {
    const body = text.trim().replace(/^\{/, "").replace(/\}$/, "");
    body.split(",").forEach(function addPair(part) {
      const index = part.indexOf(":");
      if (index <= 0) return;
      setDestination(map, part.slice(0, index), part.slice(index + 1));
    });
  }

  function addRuleEntry(entry, map) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
    const url = entry.url;
    countryCodesFromEntry(entry).forEach(function addCode(code) {
      setDestination(map, code, url);
    });
  }

  function countryCodesFromEntry(entry) {
    if (Array.isArray(entry.country_code)) return entry.country_code;
    if (typeof entry.country_code === "string") {
      return entry.country_code.split(/[\s,]+/);
    }
    if (Array.isArray(entry.countries)) {
      return entry.countries.map(function codeOf(country) {
        if (country && typeof country === "object") return country.code;
        return country;
      });
    }
    return [];
  }

  function setDestination(map, code, url) {
    const country = normalizeCountry(code);
    if (!country) return;
    map[country] = absoluteHttpUrl(url);
  }

  function absoluteHttpUrl(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    try {
      const url = new URL(text);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      if (!url.hostname) return "";
      return url.toString();
    } catch (error) {
      return "";
    }
  }

  function getGeoRedirectPlan(input) {
    const country = normalizeCountry(input.country);
    if (ipMatches(input.whitelistedIps, input.ip)) {
      return stopPlan("ip-whitelist");
    }
    if (!country) return stopPlan("no-country");

    const destinations = input.destinations || {};
    if (Object.prototype.hasOwnProperty.call(destinations, country)) {
      const destination = destinations[country];
      if (!destination) return stopPlan("invalid-destination");
      if (alreadyOnDestination(input.currentUrl, destination)) {
        return stopPlan("already-on-rule");
      }
      const url = buildRuleUrl(destination, input);
      if (!url) return stopPlan("invalid-destination");
      return { action: "rule", reason: "custom-rule", country, url };
    }

    if (!input.marketsOn) return stopPlan("markets-off");

    const marketCountries = upperCodes(input.currentMarketCountries);
    if (marketCountries.indexOf(country) !== -1) return stopPlan("current-market");

    const formCountry = normalizeCountry(input.formCountry);
    if (formCountry && formCountry === country) return stopPlan("form-country");

    const available = upperCodes(input.availableCountries);
    if (available.indexOf(country) !== -1) {
      return {
        action: "market",
        reason: "shopify-markets",
        country,
        returnTo: marketReturnTo(input.currentUrl),
      };
    }

    return stopPlan("nowhere");
  }

  function stopPlan(reason) {
    return { action: "stop", reason, country: "", url: "", returnTo: "" };
  }

  function upperCodes(values) {
    return (Array.isArray(values) ? values : [])
      .map(normalizeCountry)
      .filter(Boolean);
  }

  function precheck(input) {
    if (hasSkipFlag(input.search || "")) return { stop: true, reason: "skip" };
    if (input.designMode) return { stop: true, reason: "editor" };
    const gates = passesUrlGates(
      input.currentUrl,
      input.whitelistedUrls,
      input.reverseWhitelistedUrls,
    );
    if (!gates.ok) return { stop: true, reason: gates.reason };
    if (
      cooldownActive({
        enabled: input.enabled,
        minutes: input.minutes,
        now: input.now,
        cookie: input.cookie,
        storage: input.storage,
      })
    ) {
      return { stop: true, reason: "once" };
    }
    if (input.inFlight) return { stop: true, reason: "in-flight" };
    return { stop: false, reason: "" };
  }

  function hasSkipFlag(search) {
    const params = new URLSearchParams(
      String(search || "").replace(/^\?/, ""),
    );
    let skipped = false;
    params.forEach(function check(value, key) {
      if (key.toLowerCase() === "skipautoredirect" && value === "1") skipped = true;
    });
    return skipped;
  }

  function passesUrlGates(currentUrl, whitelist, inverted) {
    const allowed = stringList(whitelist);
    for (let index = 0; index < allowed.length; index += 1) {
      if (urlPatternMatches(allowed[index], currentUrl)) {
        return { ok: false, reason: "whitelist" };
      }
    }
    const required = stringList(inverted);
    if (required.length === 0) return { ok: true, reason: "" };
    for (let index = 0; index < required.length; index += 1) {
      if (urlPatternMatches(required[index], currentUrl)) return { ok: true, reason: "" };
    }
    return { ok: false, reason: "inverted" };
  }

  function urlPatternMatches(pattern, currentHref) {
    const raw = String(pattern ?? "").trim();
    if (!raw || !currentHref) return false;
    if (raw === "*") return true;

    let prefix = false;
    let source = raw;
    if (source.endsWith("*")) {
      prefix = true;
      source = source.slice(0, -1);
    }

    let current;
    try {
      current = new URL(currentHref);
    } catch (error) {
      return false;
    }

    if (source.startsWith("/")) {
      const parts = splitPathAndQuery(source);
      return (
        pathMatches(parts.path, current.pathname, prefix) &&
        querySatisfied(parts.search, current.search)
      );
    }

    let patternUrl;
    try {
      patternUrl = new URL(source.includes("://") ? source : `https://${source}`);
    } catch (error) {
      return false;
    }
    if (hostKey(patternUrl) !== hostKey(current)) return false;
    if (isHostOnly(source)) return querySatisfied(patternUrl.search, current.search);
    return (
      pathMatches(patternUrl.pathname, current.pathname, prefix) &&
      querySatisfied(patternUrl.search, current.search)
    );
  }

  function splitPathAndQuery(source) {
    const noHash = String(source || "").split("#")[0];
    const queryAt = noHash.indexOf("?");
    if (queryAt === -1) return { path: noHash, search: "" };
    return { path: noHash.slice(0, queryAt), search: noHash.slice(queryAt) };
  }

  function isHostOnly(source) {
    const withoutQuery = source.split("?")[0].split("#")[0];
    const body = withoutQuery.includes("://")
      ? withoutQuery.slice(withoutQuery.indexOf("://") + 3)
      : withoutQuery;
    return body.indexOf("/") === -1;
  }

  function pathMatches(patternPath, currentPath, prefix) {
    if (patternPath === "/") return true;
    const directory = patternPath.endsWith("/");
    const pattern = cleanPath(patternPath);
    const current = cleanPath(currentPath);
    if (current === pattern) return true;
    if (directory || prefix) return current.startsWith(`${pattern}/`);
    return false;
  }

  function querySatisfied(patternSearch, currentSearch) {
    const required = new URLSearchParams(
      String(patternSearch || "").includes("?")
        ? String(patternSearch).slice(String(patternSearch).indexOf("?"))
        : patternSearch || "",
    );
    const names = [];
    required.forEach(function collect(_value, key) {
      names.push(key);
    });
    if (names.length === 0) return true;
    const current = new URLSearchParams(
      String(currentSearch || "").replace(/^\?/, ""),
    );
    for (let index = 0; index < names.length; index += 1) {
      const key = names[index];
      if (current.get(key) !== required.get(key)) return false;
    }
    return true;
  }

  function ipMatches(list, ip) {
    const target = normalizeIp(ip);
    if (!target) return false;
    const entries = stringList(list);
    for (let index = 0; index < entries.length; index += 1) {
      try {
        if (normalizeIp(entries[index]) === target) return true;
      } catch (error) {
        /* A bad whitelist row never matches and never throws. */
      }
    }
    return false;
  }

  function normalizeIp(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/^\[|\]$/g, "");
  }

  function alreadyOnDestination(currentHref, targetHref) {
    let current;
    let target;
    try {
      current = new URL(currentHref);
      target = new URL(targetHref);
    } catch (error) {
      return false;
    }
    if (hostKey(current) !== hostKey(target)) return false;
    const targetPath = cleanPath(target.pathname);
    const currentPath = cleanPath(current.pathname);
    if (targetPath === "/") return true;
    if (currentPath === targetPath) return true;
    return currentPath.startsWith(`${targetPath}/`);
  }

  function buildRuleUrl(destination, input) {
    let url;
    try {
      url = new URL(destination);
    } catch (error) {
      return "";
    }
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return "";

    let current;
    try {
      current = new URL(input.currentUrl);
    } catch (error) {
      return "";
    }

    if (input.preserveRelativePath) {
      const relative = stripRoutingPrefixes(
        current.pathname,
        input.localeRoot,
        input.basePaths,
      );
      if (relative && relative !== "/") {
        const base = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
        url.pathname = `${base}${relative}`;
      }
    }

    current.searchParams.forEach(function copyUtm(value, key) {
      if (!key.toLowerCase().startsWith("utm_")) return;
      if (!url.searchParams.has(key)) url.searchParams.append(key, value);
    });
    return url.toString();
  }

  function marketReturnTo(currentHref) {
    const current = new URL(currentHref);
    return `${current.pathname}${current.search}`;
  }

  function stripRoutingPrefixes(pathname, localeRoot, basePaths) {
    const prefixes = [];
    const locale = normalizeBasePath(localeRoot);
    if (locale) prefixes.push(locale);
    stringList(basePaths).forEach(function addBase(base) {
      const normalized = normalizeBasePath(base);
      if (normalized && prefixes.indexOf(normalized) === -1) prefixes.push(normalized);
    });

    let path = String(pathname || "/");
    if (!path.startsWith("/")) path = `/${path}`;
    for (let guard = 0; guard < 12; guard += 1) {
      const next = stripLongest(path, prefixes);
      if (next === path) break;
      path = next;
    }
    return path || "/";
  }

  function stripLongest(path, prefixes) {
    const lower = path.toLowerCase();
    let best = "";
    prefixes.forEach(function consider(prefix) {
      const needle = prefix.toLowerCase();
      const matches = lower === needle || lower.startsWith(`${needle}/`);
      if (matches && needle.length > best.length) best = needle;
    });
    if (!best) return path;
    const rest = path.slice(best.length);
    if (!rest) return "/";
    return rest.startsWith("/") ? rest : `/${rest}`;
  }

  function normalizeBasePath(value) {
    let path = String(value ?? "").trim();
    if (!path) return "";
    const hash = path.indexOf("#");
    if (hash >= 0) path = path.slice(0, hash);
    const query = path.indexOf("?");
    if (query >= 0) path = path.slice(0, query);
    if (/^https?:\/\//i.test(path)) {
      try {
        path = new URL(path).pathname;
      } catch (error) {
        return "";
      }
    }
    if (!path.startsWith("/")) path = `/${path}`;
    if (path.length > 1) path = path.replace(/\/+$/, "");
    if (path === "/") return "";
    return path;
  }

  function cleanPath(path) {
    const value = String(path || "/");
    if (value.length > 1 && value.endsWith("/")) return value.slice(0, -1);
    return value || "/";
  }

  function hostKey(url) {
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (!url.port || url.port === "80" || url.port === "443") return host;
    return `${host}:${url.port}`;
  }

  function isCrawler(userAgent) {
    const agent = String(userAgent || "");
    if (/phone|playstation/i.test(agent)) return false;
    return CRAWLER.test(agent);
  }

  function cooldownActive(input) {
    if (!input || !input.enabled) return false;
    const minutes = cooldownMinutes(input.minutes);
    const now = Number.isFinite(input.now) ? input.now : Date.now();
    return stampActive(input.cookie, now, minutes) || stampActive(input.storage, now, minutes);
  }

  function cooldownMinutes(value) {
    const minutes = Number(value);
    if (!Number.isFinite(minutes)) return 60;
    return Math.max(1, Math.floor(minutes));
  }

  function stampActive(value, now, minutes) {
    if (value == null) return false;
    const text = String(value).trim();
    if (!text) return false;
    if (!/^-?\d+(\.\d+)?$/.test(text)) return true;
    const stored = Number(text);
    if (!Number.isFinite(stored)) return true;
    return now - stored < minutes * 60 * 1000;
  }
})(typeof window === "undefined" ? this : window);
