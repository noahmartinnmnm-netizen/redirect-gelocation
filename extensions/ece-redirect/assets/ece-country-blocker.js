(function initEceCountryBlocker(root) {
  const PRIMARY_LOOKUP = "https://api.zoww.app/api/country";
  const FALLBACK_LOOKUP = "https://api.country.is/";

  const FALLBACK_DESIGN = {
    templateId: "ece-blocker-default",
    content: {
      heading: "This store isn't available in your country",
      message:
        "We're sorry. Orders from your location can't be completed on this store.",
    },
    style: {
      headingSize: 28,
      maxWidth: 480,
      background: "#ffffff",
      overlay: "#111827",
      text: "#303030",
      accent: "#5700d1",
    },
  };

  const plan = {
    decideBlock,
    canonicalIpv4,
    ipv4ToLong,
    ipInAnyRange,
    readPrimary,
    readFallback,
    mergeVisitor,
    needsIpLookup,
    fallbackDesign: FALLBACK_DESIGN,
  };

  root.EceCountryBlockerPlan = plan;

  if (typeof document === "undefined") return;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  function start() {
    const config = readConfig();
    if (!config) return;
    const blocker = readBlocker(config);
    detectVisitor(blocker)
      .then(function (visitor) {
        const decision = plan.decideBlock({
          lookupOk: visitor.lookupOk,
          country: visitor.country,
          ip: visitor.ip,
          blockedCountries: blocker.blockedCountries,
          blockedIps: blocker.blockedIps,
          blockedIpRanges: blocker.blockedIpRanges,
          whitelistedIps: blocker.whitelistedIps,
        });
        if (!decision.block) return;
        showOverlay(blocker.design || FALLBACK_DESIGN, Boolean(config.designMode));
      })
      .catch(function failOpen() {
        /* A failed lookup never blocks the visitor. */
      });
  }

  function readConfig() {
    const node = document.getElementById("ece-country-blocker-config");
    if (!node) return null;
    try {
      return JSON.parse(node.textContent || "");
    } catch (error) {
      return null;
    }
  }

  function readBlocker(config) {
    const blocker =
      config.blocker && typeof config.blocker === "object" ? config.blocker : {};
    return {
      design: blocker.design || null,
      blockedCountries: stringList(blocker.blockedCountries),
      blockedIps: stringList(blocker.blockedIps),
      blockedIpRanges: stringList(blocker.blockedIpRanges),
      whitelistedIps: sharedWhitelist(config, blocker),
    };
  }

  function sharedWhitelist(config, blocker) {
    if (Array.isArray(config.whitelistedIps)) return config.whitelistedIps;
    return stringList(blocker.whitelistedIps);
  }

  async function detectVisitor(blocker) {
    const primary = await lookup(PRIMARY_LOOKUP, readPrimary);
    const needFallback =
      !primary || !primary.country || (needsIpLookup(blocker) && !primary.ip);
    const fallback = needFallback ? await lookup(FALLBACK_LOOKUP, readFallback) : null;
    return mergeVisitor(primary, fallback);
  }

  async function lookup(url, read) {
    try {
      const response = await fetch(url, {
        credentials: "omit",
        signal: abortAfter(4000),
      });
      if (!response.ok) return null;
      return read(await response.json());
    } catch (error) {
      return null;
    }
  }

  function showOverlay(design, designMode) {
    const node = document.getElementById("ece-country-blocker");
    if (!node) return;
    paint(node, design);
    node.hidden = false;
    node.style.setProperty("display", "flex", "important");
    if (!designMode) document.body.classList.add("ece-blocked-scroll");
    watch(node, designMode);
  }

  function paint(node, design) {
    const style = design.style || FALLBACK_DESIGN.style;
    const content = design.content || FALLBACK_DESIGN.content;
    node.dataset.design = knownDesign(design.templateId);
    node.style.setProperty("--ece-blocker-bg", colorOr(style.background, FALLBACK_DESIGN.style.background));
    node.style.setProperty("--ece-blocker-overlay", colorOr(style.overlay, FALLBACK_DESIGN.style.overlay));
    node.style.setProperty("--ece-blocker-text", colorOr(style.text, FALLBACK_DESIGN.style.text));
    node.style.setProperty("--ece-blocker-accent", colorOr(style.accent, FALLBACK_DESIGN.style.accent));
    node.style.setProperty("--ece-blocker-heading-size", `${clamp(style.headingSize, 16, 48, 28)}px`);
    node.style.setProperty("--ece-blocker-max-width", `${clamp(style.maxWidth, 300, 800, 480)}px`);

    const panel = document.createElement("div");
    panel.className = "ece-country-blocker__panel";
    const heading = document.createElement("h2");
    heading.className = "ece-country-blocker__heading";
    heading.textContent = String(content.heading || FALLBACK_DESIGN.content.heading);
    const message = document.createElement("p");
    message.className = "ece-country-blocker__message";
    message.textContent = String(content.message || "");
    panel.append(heading, message);
    node.replaceChildren(panel);
  }

  function watch(node, designMode) {
    if (typeof MutationObserver !== "function") return;
    let restoring = false;
    const observer = new MutationObserver(function () {
      if (restoring) return;
      const hidden = node.hidden || node.style.display === "none";
      const computedHidden =
        !designMode &&
        typeof window.getComputedStyle === "function" &&
        window.getComputedStyle(node).display === "none";
      const unlock = !designMode && !document.body.classList.contains("ece-blocked-scroll");
      if (!hidden && !computedHidden && !unlock) return;
      restoring = true;
      node.hidden = false;
      node.style.setProperty("display", "flex", "important");
      if (!designMode) document.body.classList.add("ece-blocked-scroll");
      restoring = false;
    });
    observer.observe(node, {
      attributes: true,
      attributeFilter: ["style", "hidden", "class"],
    });
    if (!designMode) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  }

  function decideBlock(input) {
    if (!input || !input.lookupOk) return { block: false, reason: "lookup" };
    const ip = identityIp(input.ip);
    const whitelist = ipList(input.whitelistedIps);
    if (ip && whitelist.indexOf(ip) !== -1) return { block: false, reason: "whitelist" };
    const country = String(input.country || "")
      .trim()
      .toUpperCase();
    const blockedCountries = upperList(input.blockedCountries);
    if (country && blockedCountries.indexOf(country) !== -1) {
      return { block: true, reason: "country" };
    }
    if (ip && ipList(input.blockedIps).indexOf(ip) !== -1) {
      return { block: true, reason: "ip" };
    }
    if (ip && ipInAnyRange(ip, input.blockedIpRanges)) {
      return { block: true, reason: "range" };
    }
    return { block: false, reason: "allow" };
  }

  function needsIpLookup(blocker) {
    return (
      stringList(blocker && blocker.blockedIps).length > 0 ||
      stringList(blocker && blocker.blockedIpRanges).length > 0 ||
      stringList(blocker && blocker.whitelistedIps).length > 0
    );
  }

  function readPrimary(payload) {
    if (!payload || payload.success !== true) return null;
    const country = String(payload.country || "").trim();
    const nested = payload.data && payload.data.ip;
    const ip = String(payload.ip || payload.visitor_ip || nested || "").trim();
    if (!country && !ip) return null;
    return { country, ip };
  }

  function readFallback(payload) {
    if (!payload || typeof payload !== "object") return null;
    const country = String(payload.country || "").trim();
    const ip = String(payload.ip || "").trim();
    if (!country && !ip) return null;
    return { country, ip };
  }

  function mergeVisitor(primary, fallback) {
    const country = (primary && primary.country) || (fallback && fallback.country) || "";
    const ip = (primary && primary.ip) || (fallback && fallback.ip) || "";
    if (!country && !ip) return { lookupOk: false, country: "", ip: "" };
    return { lookupOk: true, country, ip };
  }

  function ipInAnyRange(ip, ranges) {
    if (ipv4ToLong(ip) == null) return false;
    const list = stringList(ranges);
    for (let index = 0; index < list.length; index += 1) {
      try {
        const text = String(list[index]).trim().replace(/\s+/g, "");
        if (!text) continue;
        if (text.indexOf("/") !== -1) {
          const pieces = text.split("/");
          if (ipInCidr(ip, pieces[0], Number(pieces[1]))) return true;
          continue;
        }
        const pieces = text.split("-");
        if (ipInDash(ip, pieces[0], pieces[1])) return true;
      } catch (error) {
        /* A bad range never matches and never throws. */
      }
    }
    return false;
  }

  function ipInDash(ip, start, end) {
    const target = ipv4ToLong(ip);
    const from = ipv4ToLong(start);
    const to = ipv4ToLong(end);
    if (target == null || from == null || to == null || from > to) return false;
    return target >= from && target <= to;
  }

  function ipInCidr(ip, base, bits) {
    const target = ipv4ToLong(ip);
    const network = ipv4ToLong(base);
    if (target == null || network == null) return false;
    if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
    if (bits === 0) return true;
    const mask = bits === 32 ? 0xffffffff : (0xffffffff << (32 - bits)) >>> 0;
    return (target & mask) >>> 0 === (network & mask) >>> 0;
  }

  function canonicalIpv4(value) {
    const match = String(value ?? "")
      .trim()
      .match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!match) return "";
    const parts = [];
    for (let index = 1; index <= 4; index += 1) {
      const number = Number(match[index]);
      if (!Number.isInteger(number) || number > 255) return "";
      parts.push(String(number));
    }
    return parts.join(".");
  }

  function ipv4ToLong(value) {
    const canonical = canonicalIpv4(value);
    if (!canonical) return null;
    return canonical.split(".").reduce(function (total, part) {
      return total * 256 + Number(part);
    }, 0);
  }

  function identityIp(value) {
    const text = String(value ?? "")
      .trim()
      .replace(/^\[|\]$/g, "");
    return canonicalIpv4(text) || (text.indexOf(":") === -1 ? "" : text.toLowerCase());
  }

  function ipList(values) {
    return stringList(values)
      .map(identityIp)
      .filter(Boolean);
  }

  function upperList(values) {
    return stringList(values).map(function (value) {
      return value.toUpperCase();
    });
  }

  function stringList(values) {
    if (!Array.isArray(values)) return [];
    return values.map(function (value) {
      return String(value ?? "").trim();
    }).filter(Boolean);
  }

  function knownDesign(templateId) {
    if (
      templateId === "ece-blocker-default" ||
      templateId === "ece-blocker-modern" ||
      templateId === "ece-blocker-futuristic"
    ) {
      return templateId;
    }
    return "ece-blocker-default";
  }

  function colorOr(value, fallback) {
    const hex = String(value || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : fallback;
  }

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function abortAfter(ms) {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      return AbortSignal.timeout(ms);
    }
    return undefined;
  }
})(typeof window === "undefined" ? this : window);
