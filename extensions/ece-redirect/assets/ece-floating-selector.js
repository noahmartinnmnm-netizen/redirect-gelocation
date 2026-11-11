(function initEceFloatingSelector(root) {
  const ARRIVAL_KEY = "ece_sent";
  const SESSION_KEY_PREFIX = "ece_floating_closed:";
  const POSITIONS = ["bottom-left", "bottom-right", "top-left", "top-right"];

  const plan = {
    ARRIVAL_KEY,
    POSITIONS,
    compileDestinationMap,
    marketsRoutingOn,
    normalizeCountry,
    sanitizeColor,
    normalizePosition,
    currencyLabel,
    countryLabel,
    languageLabel,
    flagImageUrl,
    buildCountryEntries,
    filterCountries,
    buildFloatingRedirectUrl,
    buildMarketCountryUrl,
    pickCountryAction,
    sessionClosed,
    sessionKey,
  };

  root.EceFloatingSelectorPlan = plan;

  if (typeof document === "undefined") return;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  function start() {
    const config = readConfig();
    if (!config) return;
    if (!config.designMode && plan.sessionClosed(config.shop)) return;

    const destinations = plan.compileDestinationMap(config.rules);
    const marketsOn = plan.marketsRoutingOn(config.marketsRouting);
    const settings = normalizeSettings(config.settings);
    const countries = plan.buildCountryEntries({
      marketCountries: Array.isArray(config.countries) ? config.countries : [],
      destinations,
      marketsOn,
      nameFor: function nameFor(code) {
        return code;
      },
    });
    const languages = Array.isArray(config.languages) ? config.languages : [];

    if (!settings.showCountry && !settings.showLanguage) return;
    if (settings.showCountry && !countries.length && !settings.showLanguage) return;
    if (!settings.showCountry && settings.showLanguage && !languages.length) return;

    mount(config, settings, countries, languages, destinations);
  }

  function mount(config, settings, countries, languages, destinations) {
    const host = document.getElementById("ece-floating-selector");
    if (!host) return;

    const position = plan.normalizePosition(settings.position);
    host.hidden = false;
    host.className = `ece-floating-selector ece-floating-selector--${position}`;
    host.style.setProperty("--ece-fs-pill-bg", settings.pillBackground);
    host.style.setProperty("--ece-fs-pill-text", settings.pillText);
    host.style.setProperty("--ece-fs-dropdown-bg", settings.dropdownBackground);
    host.style.setProperty("--ece-fs-font", settings.fontColor);
    host.style.setProperty("--ece-fs-hover", settings.hoverColor);

    const copy = Object.assign(
      {
        open: "Open country and language selector",
        country: "Country",
        language: "Language",
        search: "Search countries",
        empty: "No countries match",
        close: "Hide selector for this session",
        select: "Select",
      },
      config.copy && typeof config.copy === "object" ? config.copy : {},
    );

    const current = countries.find(function match(item) {
      return item.code === plan.normalizeCountry(config.formCountry);
    }) || {
      code: plan.normalizeCountry(config.formCountry) || "",
      name:
        config.formCountryName ||
        plan.normalizeCountry(config.formCountry) ||
        copy.country,
      currency: null,
      source: "market",
    };

    const shell = el("div", { className: "ece-floating-selector__shell" });
    const pill = el("button", {
      type: "button",
      className: "ece-floating-selector__pill",
      attrs: {
        "aria-expanded": "false",
        "aria-controls": "ece-floating-selector-panel",
        "aria-label": copy.open,
      },
    });
    const flag = el("img", {
      className: "ece-floating-selector__flag",
      attrs: {
        src: plan.flagImageUrl(current.code),
        alt: "",
        width: "18",
        height: "12",
        loading: "lazy",
        decoding: "async",
      },
    });
    const pillLabel = el("span", {
      className: "ece-floating-selector__pill-label",
      text: plan.countryLabel(current, settings) || current.code || copy.select,
    });
    const chevron = el("span", {
      className: "ece-floating-selector__chevron",
      attrs: { "aria-hidden": "true" },
      html: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    });
    pill.append(flag, pillLabel, chevron);

    const panel = el("div", {
      className: "ece-floating-selector__panel",
      attrs: {
        id: "ece-floating-selector-panel",
        hidden: "true",
        role: "dialog",
        "aria-label": `${copy.country} / ${copy.language}`,
      },
    });

    let closeBtn = null;
    if (settings.showClose) {
      closeBtn = el("button", {
        type: "button",
        className: "ece-floating-selector__close",
        attrs: { "aria-label": copy.close },
        html: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
      });
      panel.appendChild(closeBtn);
    }

    let searchInput = null;
    let countryList = null;
    if (settings.showCountry) {
      const countryBlock = el("div", { className: "ece-floating-selector__section" });
      countryBlock.appendChild(
        el("div", {
          className: "ece-floating-selector__section-title",
          text: copy.country,
        }),
      );
      if (settings.showSearch) {
        searchInput = el("input", {
          className: "ece-floating-selector__search",
          attrs: {
            type: "search",
            placeholder: copy.search,
            autocomplete: "off",
            "aria-label": copy.search,
          },
        });
        countryBlock.appendChild(searchInput);
      }
      countryList = el("div", {
        className: "ece-floating-selector__list",
        attrs: { role: "listbox", "aria-label": copy.country },
      });
      countryBlock.appendChild(countryList);
      panel.appendChild(countryBlock);
      renderCountries(
        countryList,
        countries,
        settings,
        config,
        destinations,
        "",
        copy,
      );
    }

    if (settings.showLanguage && languages.length) {
      const languageBlock = el("div", { className: "ece-floating-selector__section" });
      languageBlock.appendChild(
        el("div", {
          className: "ece-floating-selector__section-title",
          text: copy.language,
        }),
      );
      const languageList = el("div", {
        className: "ece-floating-selector__list ece-floating-selector__list--languages",
        attrs: { role: "listbox", "aria-label": copy.language },
      });
      languages.forEach(function addLanguage(language) {
        const code = String(language.code || "").trim().toLowerCase();
        if (!code) return;
        const selected = code === String(config.formLanguage || "").trim().toLowerCase();
        const button = el("button", {
          type: "button",
          className:
            "ece-floating-selector__option" +
            (selected ? " is-selected" : ""),
          attrs: {
            role: "option",
            "aria-selected": selected ? "true" : "false",
            "data-language": code,
          },
          text: plan.languageLabel(language, settings),
        });
        button.addEventListener("click", function onLanguage() {
          submitLanguage(code, config);
        });
        languageList.appendChild(button);
      });
      languageBlock.appendChild(languageList);
      panel.appendChild(languageBlock);
    }

    function setOpen(open) {
      if (open) {
        panel.removeAttribute("hidden");
        pill.setAttribute("aria-expanded", "true");
        host.classList.add("is-open");
        if (searchInput) searchInput.focus();
      } else {
        panel.setAttribute("hidden", "true");
        pill.setAttribute("aria-expanded", "false");
        host.classList.remove("is-open");
      }
    }

    pill.addEventListener("click", function toggle() {
      setOpen(panel.hasAttribute("hidden"));
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", function hideForSession() {
        try {
          sessionStorage.setItem(plan.sessionKey(config.shop), "1");
        } catch (error) {
          /* Private mode can block sessionStorage. Still hide for this page. */
        }
        host.hidden = true;
        host.replaceChildren();
      });
    }

    if (searchInput && countryList) {
      searchInput.addEventListener("input", function onSearch() {
        renderCountries(
          countryList,
          countries,
          settings,
          config,
          destinations,
          searchInput.value,
          copy,
        );
      });
    }

    document.addEventListener("click", function onOutside(event) {
      if (!host.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    });

    shell.append(pill, panel);
    host.replaceChildren(shell);
  }

  function renderCountries(
    list,
    countries,
    settings,
    config,
    destinations,
    query,
    copy,
  ) {
    list.replaceChildren();
    const visible = plan.filterCountries(countries, query);
    if (!visible.length) {
      list.appendChild(
        el("div", {
          className: "ece-floating-selector__empty",
          text: (copy && copy.empty) || "No countries match",
        }),
      );
      return;
    }

    visible.forEach(function addCountry(country) {
      const selected =
        country.code === plan.normalizeCountry(config.formCountry);
      const button = el("button", {
        type: "button",
        className:
          "ece-floating-selector__option" + (selected ? " is-selected" : ""),
        attrs: {
          role: "option",
          "aria-selected": selected ? "true" : "false",
          "data-country": country.code,
          "data-source": country.source,
        },
      });
      const row = el("span", { className: "ece-floating-selector__option-main" });
      row.appendChild(
        el("img", {
          className: "ece-floating-selector__flag",
          attrs: {
            src: plan.flagImageUrl(country.code),
            alt: "",
            width: "18",
            height: "12",
            loading: "lazy",
            decoding: "async",
          },
        }),
      );
      row.appendChild(
        el("span", {
          className: "ece-floating-selector__option-label",
          text: plan.countryLabel(country, settings),
        }),
      );
      button.appendChild(row);
      const money = plan.currencyLabel(country.currency, settings);
      if (money) {
        button.appendChild(
          el("span", {
            className: "ece-floating-selector__currency",
            text: money,
          }),
        );
      }
      button.addEventListener("click", function onCountry() {
        const action = plan.pickCountryAction({
          country: country.code,
          source: country.source,
          destinations,
          currentUrl: window.location.href,
          localeRoot: config.localeRoot,
          formCountry: config.formCountry,
        });
        go(action, config);
      });
      list.appendChild(button);
    });
  }

  function go(action, config) {
    if (!action || action.action === "stay") return;
    if (action.action === "rule") {
      if (!action.url) return;
      window.location.assign(action.url);
      return;
    }
    if (action.action === "market") {
      if (action.url) {
        window.location.assign(action.url);
        return;
      }
      submitMarket(action.country, config);
    }
  }

  function submitMarket(country, config) {
    const form = document.querySelector("ece-floating-selector-form form");
    if (!form) return;
    const countryInput = form.querySelector('input[name="country_code"]');
    const returnTo = form.querySelector('input[name="return_to"]');
    if (countryInput) countryInput.value = country;
    if (returnTo) {
      const current = new URL(window.location.href);
      const params = new URLSearchParams(current.search);
      params.set(ARRIVAL_KEY, "1");
      const search = params.toString();
      returnTo.value = `${current.pathname}${search ? `?${search}` : ""}`;
    }
    form.submit();
  }

  function submitLanguage(language, config) {
    const form = document.querySelector("ece-floating-selector-form form");
    if (!form) return;
    const languageInput = form.querySelector('input[name="language_code"]');
    const returnTo = form.querySelector('input[name="return_to"]');
    if (languageInput) languageInput.value = language;
    if (returnTo) {
      returnTo.value = `${window.location.pathname}${window.location.search || ""}`;
    }
    void config;
    form.submit();
  }

  function normalizeSettings(raw) {
    const settings = raw && typeof raw === "object" ? raw : {};
    return {
      position: plan.normalizePosition(settings.position),
      showCountry: settings.showCountry !== false,
      showSearch: settings.showSearch !== false,
      showLanguage: settings.showLanguage !== false,
      showLanguageName: settings.showLanguageName !== false,
      showCountryCode: Boolean(settings.showCountryCode),
      showCountryName: settings.showCountryName !== false,
      showCurrencySymbol: settings.showCurrencySymbol !== false,
      showCurrencyCode: Boolean(settings.showCurrencyCode),
      showClose: settings.showClose !== false,
      pillBackground: plan.sanitizeColor(settings.pillBackground, "#111827", {
        role: "surface",
      }),
      pillText: plan.sanitizeColor(settings.pillText, "#ffffff", {
        role: "text",
      }),
      dropdownBackground: plan.sanitizeColor(
        settings.dropdownBackground,
        "#f8fafc",
        { role: "surface" },
      ),
      fontColor: plan.sanitizeColor(settings.fontColor, "#111827", {
        role: "text",
      }),
      hoverColor: plan.sanitizeColor(settings.hoverColor, "#f3f4f6", {
        role: "surface",
      }),
    };
  }

  function readConfig() {
    const node = document.getElementById("ece-floating-selector-config");
    if (!node) return null;
    try {
      return JSON.parse(node.textContent || "{}");
    } catch (error) {
      return null;
    }
  }

  function el(tag, options) {
    const node = document.createElement(tag);
    const opts = options || {};
    if (opts.className) node.className = opts.className;
    if (opts.text != null) node.textContent = opts.text;
    if (opts.html != null) node.innerHTML = opts.html;
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach(function setAttr(key) {
        const value = opts.attrs[key];
        if (value == null || value === false) return;
        node.setAttribute(key, value === true ? "" : String(value));
      });
    }
    return node;
  }

  function sessionClosed(shop) {
    try {
      return sessionStorage.getItem(sessionKey(shop)) === "1";
    } catch (error) {
      return false;
    }
  }

  function sessionKey(shop) {
    return SESSION_KEY_PREFIX + sanitizeShop(shop);
  }

  function sanitizeShop(shop) {
    return String(shop || "").replace(/[^A-Za-z0-9-]/g, "_");
  }

  function normalizePosition(value) {
    const position = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
    if (position === "left-bottom" || position === "bottomleft") return "bottom-left";
    if (position === "right-bottom" || position === "bottomright") return "bottom-right";
    if (position === "left-top" || position === "topleft") return "top-left";
    if (position === "right-top" || position === "topright") return "top-right";
    return POSITIONS.indexOf(position) !== -1 ? position : "bottom-left";
  }

  function sanitizeColor(value, fallback, options) {
    const role = options && options.role === "text" ? "text" : "surface";
    const raw = String(value ?? "").trim();
    if (!raw) return fallback;
    const lower = raw.toLowerCase();
    if (lower === "transparent" || lower === "none") return "transparent";

    let hex = lower.charAt(0) === "#" ? lower.slice(1) : lower;
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      hex = hex
        .split("")
        .map(function double(char) {
          return char + char;
        })
        .join("");
    }

    if (/^[0-9a-f]{8}$/i.test(hex)) {
      const rgb = hex.slice(0, 6).toLowerCase();
      const alpha = hex.slice(6).toLowerCase();
      if (alpha === "00") return "transparent";
      // Theme color pickers often emit 8-digit white/black; treat those as clear glass.
      if (rgb === "ffffff" || rgb === "000000") return "transparent";
      return `#${rgb}`;
    }

    if (/^[0-9a-f]{6}$/i.test(hex)) {
      const rgb = hex.toLowerCase();
      if (role === "surface" && rgb === "ffffff") return "transparent";
      return `#${rgb}`;
    }

    if (lower === "white") {
      return role === "text" ? "#ffffff" : "transparent";
    }
    if (lower === "black") {
      return role === "text" ? "#000000" : "#000000";
    }
    return raw;
  }

  function currencyLabel(currency, preferences) {
    if (!currency) return "";
    const parts = [];
    if (preferences && preferences.showCurrencyCode && currency.code) {
      parts.push(currency.code);
    }
    if (preferences && preferences.showCurrencySymbol && currency.symbol) {
      parts.push(currency.symbol);
    }
    return parts.join(" ");
  }

  function countryLabel(country, preferences) {
    if (!country) return "";
    const parts = [];
    if (!preferences || preferences.showCountryName !== false) {
      if (country.name) parts.push(country.name);
    }
    if (preferences && preferences.showCountryCode && country.code) {
      parts.push(country.code);
    }
    if (!parts.length && country.code) parts.push(country.code);
    return parts.join(" · ");
  }

  function languageLabel(language, preferences) {
    if (!language) return "";
    if (preferences && preferences.showLanguageName === false) {
      return String(language.code || "").toUpperCase();
    }
    return language.name || String(language.code || "").toUpperCase();
  }

  function flagImageUrl(code) {
    const country = normalizeCountry(code).toLowerCase();
    if (!country) return "";
    return `https://flagcdn.com/w40/${country}.png`;
  }

  function buildCountryEntries(input) {
    const byCode = new Map();
    const destinations = input.destinations || {};
    const marketCountries = Array.isArray(input.marketCountries)
      ? input.marketCountries
      : [];
    const nameFor =
      input.nameFor ||
      function identity(code) {
        return code;
      };

    Object.keys(destinations).forEach(function addRule(code) {
      const country = normalizeCountry(code);
      if (!country || !destinations[code]) return;
      const known = marketCountries.find(function same(item) {
        return normalizeCountry(item && item.code) === country;
      });
      byCode.set(country, {
        code: country,
        name: known && known.name ? known.name : nameFor(country),
        currency: known ? known.currency : null,
        source: "rule",
      });
    });

    if (input.marketsOn !== false) {
      marketCountries.forEach(function addMarket(item) {
        const country = normalizeCountry(item && item.code);
        if (!country || byCode.has(country)) return;
        byCode.set(country, {
          code: country,
          name: item.name || nameFor(country),
          currency: item.currency || null,
          source: "market",
        });
      });
    }

    const collator =
      typeof Intl !== "undefined" && Intl.Collator ? new Intl.Collator() : null;
    return Array.from(byCode.values()).sort(function byName(left, right) {
      const a = left.name || left.code;
      const b = right.name || right.code;
      return collator ? collator.compare(a, b) : a.localeCompare(b);
    });
  }

  function filterCountries(countries, query) {
    const list = Array.isArray(countries) ? countries : [];
    const needle = String(query || "")
      .trim()
      .toLowerCase();
    if (!needle) return list.slice();
    return list.filter(function match(item) {
      const name = String(item.name || "").toLowerCase();
      const code = String(item.code || "").toLowerCase();
      return name.indexOf(needle) !== -1 || code.indexOf(needle) !== -1;
    });
  }

  function pickCountryAction(input) {
    const country = normalizeCountry(input.country);
    if (!country) return { action: "stay", reason: "no-country" };
    const destinations = input.destinations || {};
    const destination = destinations[country];
    if (destination) {
      const url = buildFloatingRedirectUrl(destination, input.currentUrl);
      if (!url) return { action: "stay", reason: "invalid-destination" };
      return { action: "rule", url, country, reason: "custom-rule" };
    }
    if (input.source === "market" || country) {
      return {
        action: "market",
        country,
        url: buildMarketCountryUrl(country, input.currentUrl, input.localeRoot),
        reason: "market",
      };
    }
    return { action: "stay", country, reason: "nowhere" };
  }

  function buildFloatingRedirectUrl(destination, currentHref) {
    let url;
    try {
      url = new URL(destination);
    } catch (error) {
      return "";
    }
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) {
      return "";
    }

    let current;
    try {
      current = new URL(currentHref);
    } catch (error) {
      current = null;
    }

    if (current) {
      current.searchParams.forEach(function copyUtm(value, key) {
        if (!key.toLowerCase().startsWith("utm_")) return;
        if (!url.searchParams.has(key)) url.searchParams.append(key, value);
      });
    }
    url.searchParams.set(ARRIVAL_KEY, "1");
    return url.toString();
  }

  function buildMarketCountryUrl(country, currentHref, localeRoot) {
    const code = normalizeCountry(country);
    if (!code) return "";
    let current;
    try {
      current = new URL(currentHref);
    } catch (error) {
      const root = String(localeRoot || "/");
      return `${root}${root.indexOf("?") === -1 ? "?" : "&"}country=${encodeURIComponent(code)}&${ARRIVAL_KEY}=1`;
    }
    current.searchParams.set("country", code);
    current.searchParams.set(ARRIVAL_KEY, "1");
    return current.toString();
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

  function marketsRoutingOn(value) {
    const text = String(value ?? "").trim().toLowerCase();
    if (!text || text === "null") return true;
    if (text === "off" || text === "0" || text === "false") return false;
    return !/pinstamarket["']?\s*:\s*0/.test(text);
  }

  function normalizeCountry(value) {
    const code = String(value ?? "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : "";
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
