(function initEceRedirectPopup(root) {
  const ARRIVAL_KEY = "ece_sent";
  const CLOSE_COOKIE = "ece_popup_close";
  const CONFIRM_COOKIE = "ece_popup_go";
  const SELECTOR_COOKIE = "ece_popup_locale";
  const SELECTOR_COOKIE_MINUTES = 30;
  const ARRIVAL_STRIP_MS = 300000;
  const COUNTRY_TOKEN = "--country--";
  const FLAG_TOKEN = "--flag--";
  const TOKEN_PATTERN = /(--flag--\s*--country--|--country--\s*--flag--|--flag--|--country--)/g;
  const WIDTH_MIN = 27;
  const WIDTH_MAX = 60;

  const DEFAULTS = {
    "ece-confirm-spotlight": {
      templateId: "ece-confirm-spotlight",
      kind: "confirm",
      content: {
        heading: "Looks like you're in --flag-- --country--",
        message:
          "Shop our local store for prices in your currency, faster delivery and local support.",
        primaryButton: "Go to --country-- store",
        secondaryButton: "No thanks, stay here",
      },
      style: {
        width: 27,
        radius: 18,
        headingSize: 22,
        backdrop: 45,
        glass: false,
        background: "#ffffff",
        accent: "#5700d1",
        headingColor: "#1a1a1a",
        messageColor: "#5c5f62",
        primaryBackground: "#1a1a1a",
        primaryText: "#ffffff",
        secondaryBackground: "#ffffff",
        secondaryText: "#303030",
        dropdownBackground: "#f6f6f7",
        dropdownText: "#1a1a1a",
      },
      preferences: {
        closeButton: true,
        uppercaseCountry: false,
        showLanguages: false,
        showLanguageName: true,
        showCurrencySymbol: true,
        showCurrencyCode: true,
        headerImage: false,
        headerImageUrl: "",
        hideInCurrentMarket: true,
        hideWithoutDestination: false,
        preserveRelativePath: true,
        cookieMinutes: 30,
      },
    },
    "ece-selector-passport": {
      templateId: "ece-selector-passport",
      kind: "selector",
      content: {
        heading: "Choose your region",
        message: "We matched you to --flag-- --country--. Change it below if that's not right.",
        primaryButton: "Shop now",
        secondaryButton: "Continue browsing",
      },
      style: {
        width: 28,
        radius: 20,
        headingSize: 22,
        backdrop: 45,
        glass: false,
        background: "#ffffff",
        accent: "#0f766e",
        headingColor: "#0f172a",
        messageColor: "#475569",
        primaryBackground: "#0f766e",
        primaryText: "#ffffff",
        secondaryBackground: "#ffffff",
        secondaryText: "#0f766e",
        dropdownBackground: "#f4f6f8",
        dropdownText: "#0f172a",
      },
      preferences: {
        closeButton: false,
        uppercaseCountry: false,
        showLanguages: true,
        showLanguageName: true,
        showCurrencySymbol: true,
        showCurrencyCode: true,
        headerImage: true,
        headerImageUrl: "",
        hideInCurrentMarket: true,
        hideWithoutDestination: false,
        preserveRelativePath: true,
        cookieMinutes: 30,
      },
    },
  };

  const COLOR_KEYS = [
    "background",
    "accent",
    "headingColor",
    "messageColor",
    "primaryBackground",
    "primaryText",
    "secondaryBackground",
    "secondaryText",
    "dropdownBackground",
    "dropdownText",
  ];

  const BOOLEAN_KEYS = [
    "closeButton",
    "uppercaseCountry",
    "showLanguages",
    "showLanguageName",
    "showCurrencySymbol",
    "showCurrencyCode",
    "headerImage",
    "hideInCurrentMarket",
    "hideWithoutDestination",
    "preserveRelativePath",
  ];

  const ICONS = {
    close:
      '<path d="M5.5 5.5 14.5 14.5M14.5 5.5 5.5 14.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    arrow:
      '<path d="M4.5 10h11M11 5.5 15.5 10 11 14.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    chevron:
      '<path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    pin:
      '<path d="M10 17.2s4.8-4 4.8-7.6a4.8 4.8 0 1 0-9.6 0c0 3.6 4.8 7.6 4.8 7.6z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="9.5" r="1.6" fill="currentColor"/>',
    translate:
      '<path d="M3.5 5h7M7 3.5V5c0 3-1.8 5.5-3.8 6.5M5.2 8c.9 1.4 2.3 2.6 3.8 3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="m10.5 16.5 3-7 3 7M11.5 14.3h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
  };

  const plan = {
    ARRIVAL_KEY,
    ARRIVAL_STRIP_MS,
    resolveDesign,
    tokenParts,
    buttonLabel,
    popupWidthRem,
    hexToRgba,
    currencyLabel,
    flagImageUrl,
    headerImageUrl,
    confirmAction,
    compileDestinationMap,
    alreadyOnDestination,
    stripRoutingPrefixes,
    buildPopupUrl,
    marketReturnTo,
    urlPatternMatches,
    popupUrlGate,
    popupIpGate,
    ipMatches,
    marketsRoutingOn,
    hasArrivalMarker,
    cookieHidesPopup,
    arrivalEffect,
    countryForVisibility,
    visibility,
    selectorOptions,
    editorMode,
    normalizeCountry,
  };

  root.EceRedirectPopupPlan = plan;

  if (typeof document === "undefined") return;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  function start() {
    run().catch(function failOpen() {
      /* A failed lookup never blocks the visitor. */
    });
  }

  async function run() {
    const config = readConfig();
    const host = document.getElementById("ece-redirect-popup");
    if (!config || !host || root.__eceRedirectPopupStarted) return;
    root.__eceRedirectPopupStarted = true;

    const design = plan.resolveDesign(config.design);
    const editor = plan.editorMode(
      Boolean(config.designMode) || inDesignMode(),
      Boolean(config.hideInEditor),
    );
    if (editor === "nothing") return;

    const session = createSession(config, design, host);
    if (editor === "preview") {
      session.show(session.formCountry, session.formLanguage, null);
      return;
    }

    const currentUrl = window.location.href;
    const urlGate = plan.popupUrlGate(
      currentUrl,
      config.whitelistedUrls,
      config.reverseWhitelistedUrls,
    );
    if (urlGate.lock) {
      lockHidden(host);
      return;
    }

    const ips = stringList(config.whitelistedIps);
    if (ips.length) {
      const visitor = await detectVisitor();
      const ipGate = plan.popupIpGate(ips, visitor.ip, visitor.lookupFailed);
      if (ipGate.hide) return;
      session.visitor = visitor;
    }

    if (plan.hasArrivalMarker(window.location.search)) {
      const effect = plan.arrivalEffect(design.kind);
      if (effect.setConfirmCookie) {
        writeCookie(CONFIRM_COOKIE, "1", effect.confirmMinutes);
      }
      if (effect.stripAfterMs) {
        window.setTimeout(function stripArrival() {
          stripMarker();
        }, effect.stripAfterMs);
      }
      return;
    }

    if (
      plan.cookieHidesPopup({
        kind: design.kind,
        closeCookie: readCookie(CLOSE_COOKIE),
        confirmCookie: readCookie(CONFIRM_COOKIE),
        selectorCookie: readCookie(SELECTOR_COOKIE),
      })
    ) {
      return;
    }

    if (design.kind === "selector") {
      if (session.visitor) {
        openFromVisitor(session, session.visitor);
        return;
      }
      const pageDecision = plan.visibility(session.visibilityInput(session.formCountry));
      if (pageDecision.show) {
        session.show(session.formCountry, session.formLanguage, null);
      }
      const visitor = await detectVisitor();
      if (session.userTouched || !visitor.country) return;
      const next = plan.visibility(session.visibilityInput(visitor.country));
      if (!next.show) {
        session.hide();
        return;
      }
      if (visitor.country !== session.countryCode || !pageDecision.show) {
        session.show(visitor.country, session.languageCode, "country");
      }
      return;
    }

    openFromVisitor(session, session.visitor || (await detectVisitor()));
  }

  function openFromVisitor(session, visitor) {
    const country = plan.countryForVisibility(
      visitor.country,
      session.formCountry,
      session.design.preferences.hideWithoutDestination,
    );
    const decision = plan.visibility(session.visibilityInput(country));
    if (!decision.show) return;
    session.show(visitor.country || session.formCountry, session.formLanguage, null);
  }

  function createSession(config, design, host) {
    const countries = countryRecords(config.countries);
    const languages = languageRecords(config.languages);
    const destinations = plan.compileDestinationMap(config.rules);
    const marketsOn = plan.marketsRoutingOn(config.marketsRouting);
    const scrollLock = { html: "", body: "", active: false };
    let hideLock = null;

    const session = {
      design,
      formCountry: plan.normalizeCountry(config.formCountry) || "US",
      formLanguage: String(config.formLanguage || "").trim().toLowerCase(),
      countryCode: "",
      languageCode: "",
      userTouched: false,
      visibilityInput(country) {
        return {
          country,
          destinations,
          currentUrl: window.location.href,
          currentMarketCountries: config.currentMarketCountries,
          availableCountries: countries.map(function codeOf(country) {
            return country.code;
          }),
          marketsOn,
          hideInCurrentMarket: design.preferences.hideInCurrentMarket,
          hideWithoutDestination: design.preferences.hideWithoutDestination,
        };
      },
      show(countryCode, languageCode, focus) {
        if (hideLock) return;
        session.countryCode = plan.normalizeCountry(countryCode) || session.formCountry;
        session.languageCode = languageCode || session.formLanguage;
        paint(session, countries, languages, destinations, marketsOn, focus);
        host.hidden = false;
        lockScroll(scrollLock, true);
      },
      hide() {
        host.hidden = true;
        host.replaceChildren();
        lockScroll(scrollLock, false);
      },
      confirm() {
        writeCookie(CONFIRM_COOKIE, "1", design.preferences.cookieMinutes);
        if (design.kind === "selector") {
          writeCookie(SELECTOR_COOKIE, "1", SELECTOR_COOKIE_MINUTES);
        }
        const decision = plan.confirmAction({
          country: session.countryCode,
          formCountry: config.formCountry,
          language: session.languageCode,
          formLanguage: config.formLanguage,
          destinations,
          marketsOn,
          availableCountries: countries.map(function codeOf(item) {
            return item.code;
          }),
          currentUrl: window.location.href,
          preserveRelativePath: design.preferences.preserveRelativePath,
          localeRoot: config.localeRoot,
          basePaths: config.basePaths,
        });
        if (decision.action === "rule" && decision.url) {
          window.location.assign(decision.url);
          return;
        }
        if (decision.action === "market") {
          submitMarket(decision);
          return;
        }
        session.hide();
      },
      stay() {
        writeCookie(CLOSE_COOKIE, "1", design.preferences.cookieMinutes);
        session.hide();
      },
    };

    return session;

    function paint(state, marketCountries, languageList, destinationMap, marketsEnabled, focus) {
      const country = describeCountry(state.countryCode, marketCountries);
      const options =
        design.kind === "selector"
          ? plan.selectorOptions({
              marketCountries,
              destinations: destinationMap,
              marketsOn: marketsEnabled,
              nameFor(code) {
                return describeCountry(code, marketCountries).name;
              },
            })
          : [];
      if (
        design.kind === "selector" &&
        options.length &&
        !options.some(function same(item) {
          return item.code === country.code;
        })
      ) {
        state.countryCode = options[0].code;
      }
      const selected = describeCountry(state.countryCode, marketCountries);
      const language = selectedLanguage(languageList, state.languageCode);
      state.languageCode = language ? language.code : "";

      const overlay = h("div", { className: "ece-pp-overlay" });
      applyVars(overlay, design);
      overlay.append(
        design.kind === "selector"
          ? passport(state, selected, options, languageList, language, marketCountries)
          : spotlight(selected),
      );
      overlay.addEventListener("keydown", function onKey(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          state.stay();
        }
      });
      host.replaceChildren(overlay);

      const focusTarget =
        (focus && overlay.querySelector(`[data-ece-focus="${focus}"]`)) ||
        overlay.querySelector(".ece-pp-btn.is-primary") ||
        overlay.querySelector("button, select");
      if (focusTarget) focusTarget.focus();
    }

    function spotlight(country) {
      const popup = h("div", {
        className: `ece-pp-popup ece-pp-spotlight${design.style.glass ? " is-glass" : ""}`,
        attrs: { role: "dialog", "aria-modal": "true", "aria-label": "Store suggestion" },
      });
      if (design.preferences.closeButton) popup.append(closeButton(false));
      popup.append(h("div", { className: "ece-pp-spotlight__glow", attrs: { "aria-hidden": "true" } }));
      const badge = h("div", { className: "ece-pp-spotlight__badge" });
      badge.append(flag(country.code, "large"));
      const pin = h("span", { className: "ece-pp-spotlight__pin", attrs: { "aria-hidden": "true" } });
      pin.append(icon("pin"));
      badge.append(pin);
      const heading = h("h2", { className: "ece-pp-heading" });
      fillTokens(heading, design.content.heading, country);
      popup.append(badge, heading);
      if (design.content.message) {
        const message = h("p", { className: "ece-pp-message" });
        fillTokens(message, design.content.message, country);
        popup.append(message);
      }
      popup.append(actions(country, "is-secondary", true));
      return popup;
    }

    function passport(state, country, options, languageList, language, marketCountries) {
      const popup = h("div", {
        className: `ece-pp-popup ece-pp-passport${design.style.glass ? " is-glass" : ""}${
          design.preferences.headerImage ? " has-header" : ""
        }`,
        attrs: { role: "dialog", "aria-modal": "true", "aria-label": "Choose your region" },
      });
      if (design.preferences.closeButton) {
        popup.append(closeButton(design.preferences.headerImage));
      }
      if (design.preferences.headerImage) {
        const header = h("div", { className: "ece-pp-passport__header" });
        header.append(headerVisual(design.preferences.headerImageUrl));
        const flagWrap = h("span", { className: "ece-pp-passport__flag" });
        flagWrap.append(flag(country.code, "large"));
        header.append(flagWrap);
        popup.append(header);
      }
      const body = h("div", { className: "ece-pp-passport__body" });
      const heading = h("h2", { className: "ece-pp-heading" });
      fillTokens(heading, design.content.heading, country);
      body.append(heading);
      if (design.content.message) {
        const message = h("p", { className: "ece-pp-message" });
        fillTokens(message, design.content.message, country);
        body.append(message);
      }
      const fields = h("div", { className: "ece-pp-fields" });
      fields.append(countryField(state, country, options, marketCountries));
      if (design.preferences.showLanguages && languageList.length) {
        fields.append(languageField(state, languageList, language));
      }
      body.append(fields);
      body.append(actions(country, "is-link", false));
      popup.append(body);
      return popup;
    }

    function countryField(state, country, options, marketCountries) {
      const label = h("label", { className: "ece-pp-field" });
      label.append(h("span", { className: "ece-pp-field__label", text: "Country / region" }));
      const shell = h("span", { className: "ece-pp-select" });
      shell.append(flag(country.code, "small"));
      const select = h("select", {
        attrs: { "data-ece-focus": "country", "aria-label": "Country / region" },
        on: {
          change(event) {
            state.userTouched = true;
            state.show(event.target.value, state.languageCode, "country");
          },
        },
      });
      const rows = options.length
        ? options
        : [describeCountry(country.code, marketCountries)];
      rows.forEach(function addOption(item) {
        const described = describeCountry(item.code, marketCountries);
        const money = plan.currencyLabel(described.currency, design.preferences);
        const option = h("option", {
          text: money ? `${described.name} (${money})` : described.name,
          attrs: { value: described.code },
        });
        if (described.code === country.code) option.selected = true;
        select.append(option);
      });
      shell.append(select, icon("chevron"));
      label.append(shell);
      return label;
    }

    function languageField(state, languageList, language) {
      const label = h("label", { className: "ece-pp-field" });
      label.append(h("span", { className: "ece-pp-field__label", text: "Language" }));
      const shell = h("span", { className: "ece-pp-select" });
      const glyph = h("span", { className: "ece-pp-select__icon" });
      glyph.append(icon("translate"));
      const select = h("select", {
        attrs: { "data-ece-focus": "language", "aria-label": "Language" },
        on: {
          change(event) {
            state.userTouched = true;
            state.show(state.countryCode, event.target.value, "language");
          },
        },
      });
      languageList.forEach(function addLanguage(item) {
        const option = h("option", {
          text: design.preferences.showLanguageName ? item.name : item.code.toUpperCase(),
          attrs: { value: item.code },
        });
        if (language && item.code === language.code) option.selected = true;
        select.append(option);
      });
      shell.append(glyph, select, icon("chevron"));
      label.append(shell);
      return label;
    }

    function actions(country, secondaryClass, withArrow) {
      const row = h("div", { className: "ece-pp-actions" });
      const primary = plan.buttonLabel(
        design.content.primaryButton,
        country.name,
        design.preferences.uppercaseCountry,
      );
      const secondary = plan.buttonLabel(
        design.content.secondaryButton,
        country.name,
        design.preferences.uppercaseCountry,
      );
      if (primary) {
        const button = h("button", {
          className: "ece-pp-btn is-primary",
          attrs: { type: "button" },
          on: {
            click() {
              session.confirm();
            },
          },
        });
        button.append(document.createTextNode(primary));
        if (withArrow) button.append(icon("arrow"));
        row.append(button);
      }
      if (secondary) {
        row.append(
          h("button", {
            className: `ece-pp-btn ${secondaryClass}`,
            text: secondary,
            attrs: { type: "button" },
            on: {
              click() {
                session.stay();
              },
            },
          }),
        );
      }
      return row;
    }

    function closeButton(onImage) {
      const button = h("button", {
        className: `ece-pp-close${onImage ? " is-on-image" : ""}`,
        attrs: { type: "button", "aria-label": "Close popup" },
        on: {
          click() {
            session.stay();
          },
        },
      });
      button.append(icon("close"));
      return button;
    }
  }

  function describeCountry(code, marketCountries) {
    const country = plan.normalizeCountry(code);
    const known = marketCountries.find(function same(item) {
      return item.code === country;
    });
    if (known) return known;
    return {
      code: country,
      name: regionName(country),
      currency: null,
    };
  }

  function regionName(code) {
    if (!code) return "";
    try {
      const names = new Intl.DisplayNames(
        [document.documentElement.lang || "en"],
        { type: "region" },
      );
      return names.of(code) || code;
    } catch (error) {
      return code;
    }
  }

  function selectedLanguage(languages, code) {
    if (!languages.length) return null;
    const wanted = String(code || "").toLowerCase();
    return (
      languages.find(function same(item) {
        return item.code === wanted;
      }) || languages[0]
    );
  }

  function headerVisual(url) {
    const source = plan.headerImageUrl(url);
    if (!source) return headerArt();
    const image = h("img", {
      className: "ece-pp-passport__image",
      attrs: { src: source, alt: "" },
    });
    image.addEventListener("error", function useArt() {
      image.replaceWith(headerArt());
    });
    return image;
  }

  function headerArt() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ece-pp-passport__art");
    svg.setAttribute("viewBox", "0 0 400 140");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<circle cx="320" cy="150" r="120" fill="none" stroke="currentColor" stroke-opacity="0.22"/>' +
      '<ellipse cx="320" cy="150" rx="50" ry="120" fill="none" stroke="currentColor" stroke-opacity="0.18"/>' +
      '<ellipse cx="320" cy="150" rx="95" ry="120" fill="none" stroke="currentColor" stroke-opacity="0.14"/>' +
      '<path d="M200 110h240M210 70h220M240 35h160" stroke="currentColor" stroke-opacity="0.16"/>' +
      '<circle cx="60" cy="-10" r="90" fill="currentColor" fill-opacity="0.07"/>' +
      '<circle cx="140" cy="40" r="3" fill="currentColor" fill-opacity="0.5"/>' +
      '<circle cx="230" cy="62" r="3" fill="currentColor" fill-opacity="0.5"/>' +
      '<path d="M140 40 Q185 15 230 62" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="3 5"/>';
    return svg;
  }

  function fillTokens(parent, text, country) {
    plan.tokenParts(text).forEach(function append(part) {
      if (part.type === "text") {
        parent.append(document.createTextNode(part.value));
        return;
      }
      if (part.type === "flagCountry") {
        const token = h("span", { className: "ece-pp-token" });
        token.append(flag(country.code, "small"), document.createTextNode(country.name));
        parent.append(token);
        return;
      }
      if (part.type === "flag") {
        parent.append(flag(country.code, "small"));
        return;
      }
      parent.append(h("span", { className: "ece-pp-token is-name", text: country.name }));
    });
  }

  function flag(code, size) {
    const image = h("img", {
      className: `ece-pp-flag is-${size || "small"}`,
      attrs: { src: plan.flagImageUrl(code), alt: "" },
    });
    image.addEventListener("error", function fallback() {
      image.replaceWith(
        h("span", {
          className: `${image.className} is-fallback`,
          text: code,
        }),
      );
    });
    return image;
  }

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ece-pp-icon");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.innerHTML = ICONS[name] || "";
    return svg;
  }

  function applyVars(node, design) {
    const style = design.style;
    node.style.setProperty("--pp-width", `${plan.popupWidthRem(style.width)}rem`);
    node.style.setProperty("--pp-radius", `${style.radius}px`);
    node.style.setProperty("--pp-heading-size", `${style.headingSize}px`);
    node.style.setProperty(
      "--pp-bg",
      style.glass ? plan.hexToRgba(style.background, 0.74) : style.background,
    );
    node.style.setProperty("--pp-accent", style.accent);
    node.style.setProperty("--pp-accent-soft", plan.hexToRgba(style.accent, 0.12));
    node.style.setProperty("--pp-accent-ring", plan.hexToRgba(style.accent, 0.22));
    node.style.setProperty("--pp-heading", style.headingColor);
    node.style.setProperty("--pp-message", style.messageColor);
    node.style.setProperty("--pp-primary-bg", style.primaryBackground);
    node.style.setProperty("--pp-primary-text", style.primaryText);
    node.style.setProperty("--pp-secondary-bg", style.secondaryBackground);
    node.style.setProperty("--pp-secondary-text", style.secondaryText);
    node.style.setProperty("--pp-dropdown-bg", style.dropdownBackground);
    node.style.setProperty("--pp-dropdown-text", style.dropdownText);
    node.style.setProperty("--pp-backdrop", `rgba(15, 23, 42, ${style.backdrop / 100})`);
  }

  function submitMarket(decision) {
    const form = document.querySelector("ece-redirect-popup-form form");
    if (!form) return;
    const countryInput = form.querySelector('input[name="country_code"]');
    const languageInput = form.querySelector('input[name="language_code"]');
    const returnTo = form.querySelector('input[name="return_to"]');
    if (countryInput) countryInput.value = decision.country;
    if (languageInput && decision.language) languageInput.value = decision.language;
    if (returnTo) returnTo.value = decision.returnTo;
    form.submit();
  }

  function h(tag, props) {
    const node = document.createElement(tag);
    const data = props || {};
    if (data.className) node.className = data.className;
    if (data.text != null) node.textContent = data.text;
    if (data.attrs) {
      Object.keys(data.attrs).forEach(function setAttr(key) {
        node.setAttribute(key, data.attrs[key]);
      });
    }
    if (data.on) {
      Object.keys(data.on).forEach(function listen(key) {
        node.addEventListener(key, data.on[key]);
      });
    }
    for (let index = 2; index < arguments.length; index += 1) {
      appendChild(node, arguments[index]);
    }
    return node;
  }

  function appendChild(node, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(function add(item) {
        appendChild(node, item);
      });
      return;
    }
    node.append(child);
  }

  function readConfig() {
    const node = document.getElementById("ece-redirect-popup-config");
    if (!node) return null;
    try {
      const parsed = JSON.parse(node.textContent || "");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  async function detectVisitor() {
    let country = "";
    let ip = "";
    let lookupFailed = false;
    try {
      const data = await fetchJson("https://api.country.is/", "omit");
      country = plan.normalizeCountry(data && data.country);
      ip = String((data && data.ip) || "");
    } catch (error) {
      lookupFailed = true;
    }
    if (!country) {
      try {
        const data = await fetchJson(suggestionsUrl(), "same-origin");
        const detected = data && data.detected_values && data.detected_values.country;
        const suggestion = plan.normalizeCountry(detected && detected.handle);
        if (suggestion) {
          country = suggestion;
          lookupFailed = false;
        }
      } catch (error) {
        /* The storefront country is the label fallback when both lookups fail. */
      }
    }
    return { country, ip, lookupFailed };
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
    if (!response.ok) throw new Error("lookup failed");
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

  function lockHidden(node) {
    node.hidden = true;
    node.style.setProperty("display", "none", "important");
    const observer = new MutationObserver(function restore() {
      if (!node.hidden || node.style.display !== "none") {
        node.hidden = true;
        node.style.setProperty("display", "none", "important");
      }
    });
    observer.observe(node, {
      attributes: true,
      attributeFilter: ["hidden", "style", "class"],
    });
  }

  function lockScroll(state, on) {
    if (on) {
      if (state.active) return;
      state.html = document.documentElement.style.overflow;
      state.body = document.body.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      state.active = true;
      return;
    }
    if (!state.active) return;
    document.documentElement.style.overflow = state.html;
    document.body.style.overflow = state.body;
    state.active = false;
  }

  function writeCookie(name, value, minutes) {
    const maxAge = Math.max(1, Number(minutes) || 30) * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/`;
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

  function stripMarker() {
    const url = new URL(window.location.href);
    let changed = false;
    const keys = [];
    url.searchParams.forEach(function collect(_value, key) {
      keys.push(key);
    });
    keys.forEach(function remove(key) {
      if (key.toLowerCase() === ARRIVAL_KEY) {
        url.searchParams.delete(key);
        changed = true;
      }
    });
    if (!changed) return;
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function resolveDesign(raw) {
    const parsed = parseMaybe(raw);
    const source = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    const templateId = source && source.templateId;
    const known = Object.prototype.hasOwnProperty.call(DEFAULTS, templateId);
    const base = DEFAULTS[known ? templateId : "ece-selector-passport"];
    const design = {
      templateId: base.templateId,
      kind: base.kind,
      content: Object.assign({}, base.content),
      style: Object.assign({}, base.style),
      preferences: Object.assign({}, base.preferences),
    };
    if (!source || !known) return design;

    Object.keys(design.content).forEach(function copyText(key) {
      if (source.content && source.content[key] != null) {
        design.content[key] = String(source.content[key]);
      }
    });
    const style = source.style || {};
    if (style.width != null && style.width !== "") design.style.width = style.width;
    design.style.width = popupWidthRem(design.style.width);
    design.style.radius = clamp(style.radius, 0, 32, base.style.radius);
    design.style.headingSize = clamp(style.headingSize, 16, 36, base.style.headingSize);
    design.style.backdrop = clamp(style.backdrop, 0, 80, base.style.backdrop);
    design.style.glass = readBool(style.glass, base.style.glass);
    COLOR_KEYS.forEach(function copyColor(key) {
      design.style[key] = readColor(style[key], base.style[key]);
    });
    const preferences = source.preferences || {};
    BOOLEAN_KEYS.forEach(function copyFlag(key) {
      design.preferences[key] = readBool(preferences[key], base.preferences[key]);
    });
    design.preferences.cookieMinutes = clamp(
      preferences.cookieMinutes,
      1,
      10080,
      base.preferences.cookieMinutes,
    );
    design.preferences.headerImageUrl = headerImageUrl(preferences.headerImageUrl);
    return design;
  }

  function headerImageUrl(value) {
    let url = String(value ?? "").trim();
    if (!url) return "";
    if (url.startsWith("//")) url = `https:${url}`;
    if (!/^https?:\/\//i.test(url)) return "";
    return url;
  }

  function tokenParts(text) {
    return String(text || "")
      .split(TOKEN_PATTERN)
      .filter(function keep(part) {
        return part !== "";
      })
      .map(function classify(part) {
        if (part === FLAG_TOKEN) return { type: "flag" };
        if (part === COUNTRY_TOKEN) return { type: "country" };
        if (part.includes(FLAG_TOKEN) && part.includes(COUNTRY_TOKEN)) {
          return { type: "flagCountry" };
        }
        return { type: "text", value: part };
      });
  }

  function buttonLabel(text, countryName, uppercase) {
    const name = uppercase ? String(countryName || "").toUpperCase() : String(countryName || "");
    return String(text || "")
      .split(FLAG_TOKEN)
      .join("")
      .split(COUNTRY_TOKEN)
      .join(name)
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function popupWidthRem(value) {
    const width = Number(value);
    if (!Number.isFinite(width)) return WIDTH_MIN;
    const rem = width > 100 ? width / 10 : width;
    return Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, rem));
  }

  function currencyLabel(currency, preferences) {
    if (!currency) return "";
    const parts = [];
    if (preferences.showCurrencyCode && currency.code) parts.push(currency.code);
    if (preferences.showCurrencySymbol && currency.symbol) parts.push(currency.symbol);
    return parts.join(" ");
  }

  function hexToRgba(hex, alpha) {
    let value = String(hex || "").replace("#", "").trim();
    if (value.length === 3) {
      value = value
        .split("")
        .map(function double(char) {
          return char + char;
        })
        .join("");
    }
    if (!/^[0-9a-f]{6}/i.test(value)) return `rgba(255, 255, 255, ${alpha})`;
    return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${alpha})`;
  }

  function flagImageUrl(code) {
    return `https://flagcdn.com/w80/${String(code || "").toLowerCase()}.png`;
  }

  function editorMode(designMode, hideInEditor) {
    if (!designMode) return "store";
    return hideInEditor ? "nothing" : "preview";
  }

  function countryForVisibility(detected, formCountry, hideWithoutDestination) {
    const country = normalizeCountry(detected);
    if (country) return country;
    if (hideWithoutDestination) return "";
    return normalizeCountry(formCountry);
  }

  function visibility(input) {
    const country = normalizeCountry(input.country);
    const destinations = input.destinations || {};
    const destination = country ? destinations[country] : "";
    const hasRule = Boolean(destination);
    const onRule = hasRule && alreadyOnDestination(input.currentUrl, destination);
    const marketsOn = input.marketsOn !== false;
    const inCurrent = upperCodes(input.currentMarketCountries).indexOf(country) !== -1;
    const inAnother =
      marketsOn &&
      Boolean(country) &&
      upperCodes(input.availableCountries).indexOf(country) !== -1 &&
      !inCurrent;

    if (input.hideWithoutDestination) {
      if (!country) return hide("no-country");
      if (!hasRule && !inAnother) return hide("nowhere");
      if (hasRule && onRule) return hide("already-on-rule");
      return show(hasRule ? "custom-rule" : "other-market");
    }

    if (hasRule && !onRule) return show("custom-rule");
    if (input.hideInCurrentMarket && country && inCurrent) return hide("current-market");
    return show(hasRule ? "already-on-rule" : "default");
  }

  function show(reason) {
    return { show: true, reason };
  }

  function hide(reason) {
    return { show: false, reason };
  }

  function cookieHidesPopup(input) {
    if (present(input && input.closeCookie)) return "close";
    if (present(input && input.confirmCookie)) return "confirm";
    if (input && input.kind === "selector" && present(input.selectorCookie)) return "selector";
    return "";
  }

  function arrivalEffect(kind) {
    if (kind === "selector") {
      return {
        hide: true,
        setConfirmCookie: true,
        confirmMinutes: SELECTOR_COOKIE_MINUTES,
        stripAfterMs: ARRIVAL_STRIP_MS,
      };
    }
    return { hide: true, setConfirmCookie: false, confirmMinutes: 0, stripAfterMs: 0 };
  }

  function hasArrivalMarker(search) {
    const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
    let marked = false;
    params.forEach(function check(value, key) {
      if (key.toLowerCase() === ARRIVAL_KEY && value === "1") marked = true;
    });
    return marked;
  }

  function selectorOptions(input) {
    const byCode = new Map();
    const marketCountries = Array.isArray(input.marketCountries) ? input.marketCountries : [];
    const destinations = input.destinations || {};
    const nameFor = input.nameFor || function identity(code) {
      return code;
    };
    Object.keys(destinations).forEach(function addRule(code) {
      const country = normalizeCountry(code);
      if (!country || !destinations[code]) return;
      const known = marketCountries.find(function same(item) {
        return normalizeCountry(item.code) === country;
      });
      byCode.set(country, {
        code: country,
        name: known && known.name ? known.name : nameFor(country),
        currency: known ? known.currency : null,
        source: "rule",
      });
    });
    if (input.marketsOn) {
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

  function popupUrlGate(currentUrl, whitelist, inverted) {
    // The inverted URL list gates automatic redirect only. It does not hide this popup.
    void inverted;
    const allowed = stringList(whitelist);
    for (let index = 0; index < allowed.length; index += 1) {
      if (urlPatternMatches(allowed[index], currentUrl)) {
        return { hide: true, lock: true, reason: "whitelist" };
      }
    }
    return { hide: false, lock: false, reason: "" };
  }

  function popupIpGate(list, ip, lookupFailed) {
    const entries = stringList(list);
    if (!entries.length) return { hide: false, reason: "" };
    if (lookupFailed) return { hide: false, reason: "lookup-failed" };
    if (ipMatches(entries, ip)) return { hide: true, reason: "ip-whitelist" };
    return { hide: false, reason: "" };
  }

  function confirmAction(input) {
    const country = normalizeCountry(input.country);
    const destinations = input.destinations || {};
    const destination = country ? destinations[country] : "";
    if (destination) {
      const url = buildPopupUrl(destination, input);
      if (url) return { action: "rule", url, country };
    }
    const formCountry = normalizeCountry(input.formCountry);
    const language = String(input.language || "").trim().toLowerCase();
    const formLanguage = String(input.formLanguage || "").trim().toLowerCase();
    const languageChanged = Boolean(language) && language !== formLanguage;
    const available = upperCodes(input.availableCountries);
    if (
      input.marketsOn !== false &&
      country &&
      available.indexOf(country) !== -1 &&
      (languageChanged || country !== formCountry)
    ) {
      return {
        action: "market",
        country,
        language,
        returnTo: marketReturnTo(input),
      };
    }
    return { action: "stay", country };
  }

  function marketReturnTo(input) {
    if (!input || (!input.preserve && !input.preserveRelativePath)) {
      return `/?${ARRIVAL_KEY}=1`;
    }
    const current = new URL(input.currentUrl);
    const params = new URLSearchParams(current.search);
    params.set(ARRIVAL_KEY, "1");
    const search = params.toString();
    return `${current.pathname}${search ? `?${search}` : ""}`;
  }

  function buildPopupUrl(destination, input) {
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
      const relative = stripRoutingPrefixes(current.pathname, input.localeRoot, input.basePaths);
      if (relative && relative !== "/") {
        const base = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
        url.pathname = `${base}${relative}`;
      }
    }

    current.searchParams.forEach(function copyUtm(value, key) {
      if (!key.toLowerCase().startsWith("utm_")) return;
      if (!url.searchParams.has(key)) url.searchParams.append(key, value);
    });
    url.searchParams.set(ARRIVAL_KEY, "1");
    return url.toString();
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
    if (typeof entry.country_code === "string") return entry.country_code.split(/[\s,]+/);
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
    return true;
  }

  function normalizeCountry(value) {
    const code = String(value ?? "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : "";
  }

  function upperCodes(values) {
    return stringList(values).map(normalizeCountry).filter(Boolean);
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
      return pathMatches(parts.path, current.pathname, prefix) && querySatisfied(parts.search, current.search);
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
    const current = new URLSearchParams(String(currentSearch || "").replace(/^\?/, ""));
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

  function stringList(value) {
    if (Array.isArray(value)) {
      return value
        .map(function toText(item) {
          return String(item ?? "").trim();
        })
        .filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      try {
        return stringList(JSON.parse(value));
      } catch (error) {
        return value
          .split(",")
          .map(function trim(item) {
            return item.trim();
          })
          .filter(Boolean);
      }
    }
    return [];
  }

  function countryRecords(value) {
    return stringObjects(value)
      .map(function record(item) {
        const code = normalizeCountry(item.code);
        if (!code) return null;
        return {
          code,
          name: String(item.name || code),
          currency: {
            code: String(item.currency && item.currency.code ? item.currency.code : ""),
            symbol: String(item.currency && item.currency.symbol ? item.currency.symbol : ""),
          },
        };
      })
      .filter(Boolean);
  }

  function languageRecords(value) {
    return stringObjects(value)
      .map(function record(item) {
        const code = String(item.code || "").trim().toLowerCase();
        if (!code) return null;
        return { code, name: String(item.name || code) };
      })
      .filter(Boolean);
  }

  function stringObjects(value) {
    const parsed = parseMaybe(value);
    return Array.isArray(parsed) ? parsed : [];
  }

  function parseMaybe(value) {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return null;
    }
  }

  function readBool(value, fallback) {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "1" || value === 1) return true;
    if (value === "false" || value === "0" || value === 0) return false;
    return fallback;
  }

  function readColor(value, fallback) {
    let hex = String(value ?? "").trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(hex)) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
    return fallback;
  }

  function clamp(value, min, max, fallback) {
    if (value == null || value === "") return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function present(value) {
    return String(value ?? "").trim() !== "";
  }
})(typeof window === "undefined" ? this : window);
