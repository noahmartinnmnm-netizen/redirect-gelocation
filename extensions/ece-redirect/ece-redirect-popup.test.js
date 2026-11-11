/* eslint-env node */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createContext, runInContext } from "node:vm";

const context = {
  console,
  URL,
  URLSearchParams,
  Intl,
  Map,
};
context.globalThis = context;
createContext(context);
runInContext(
  readFileSync(new URL("./assets/ece-redirect-popup.js", import.meta.url), "utf8"),
  context,
);
const plan = context.EceRedirectPopupPlan;

const HERE = "https://shop.example/products/red-tshirt?utm_source=ads&ref=home";
const RULES = [
  {
    name: "EU store",
    country_code: ["FR", "DE"],
    url: "https://eu.example/shop",
  },
];

function destinations(rules = RULES) {
  return plan.compileDestinationMap(rules);
}

function see(overrides) {
  return plan.visibility({
    country: "FR",
    destinations: destinations(),
    currentUrl: HERE,
    currentMarketCountries: ["US"],
    availableCountries: ["US", "CA", "DE", "FR"],
    marketsOn: true,
    hideInCurrentMarket: true,
    hideWithoutDestination: false,
    ...overrides,
  });
}

test("an empty design falls back to the passport selector", () => {
  const design = plan.resolveDesign(null);
  assert.equal(design.templateId, "ece-selector-passport");
  assert.equal(design.kind, "selector");
  assert.equal(design.preferences.preserveRelativePath, true);
  assert.equal(design.preferences.cookieMinutes, 30);
});

test("a saved spotlight design keeps its content and colors", () => {
  const design = plan.resolveDesign({
    templateId: "ece-confirm-spotlight",
    content: {
      heading: "Hello --flag-- --country--",
      message: "Local store",
      primaryButton: "Go to --flag-- --country--",
      secondaryButton: "Stay",
    },
    style: { width: 270, glass: "false", background: "#111111", accent: "#abcdef" },
    preferences: { closeButton: "false", uppercaseCountry: "true", cookieMinutes: "15" },
  });
  assert.equal(design.kind, "confirm");
  assert.equal(design.style.width, 27);
  assert.equal(design.style.glass, false);
  assert.equal(design.style.background, "#111111");
  assert.equal(design.preferences.closeButton, false);
  assert.equal(design.preferences.uppercaseCountry, true);
  assert.equal(design.preferences.cookieMinutes, 15);
});

test("a width above 100 is legacy pixels and is divided by 10", () => {
  assert.equal(plan.popupWidthRem(270), 27);
  assert.equal(plan.popupWidthRem(40), 40);
  assert.equal(plan.popupWidthRem(8), 27);
  assert.equal(plan.popupWidthRem(90), 60);
});

test("adjacent flag and country tokens render as one pair, and buttons drop the flag", () => {
  const parts = plan.tokenParts("Looks like you're in --flag-- --country--");
  assert.equal(Array.from(parts, (part) => part.type).join(","), "text,flagCountry");
  assert.equal(plan.buttonLabel("Go to --flag-- --country-- store", "France", true), "Go to FRANCE store");
  assert.equal(plan.flagImageUrl("FR"), "https://flagcdn.com/w80/fr.png");
});

test("a custom rule shows even when the visitor is already in this market", () => {
  const decision = see({
    currentMarketCountries: ["US", "FR"],
    hideInCurrentMarket: true,
  });
  assert.equal(decision.show, true);
  assert.equal(decision.reason, "custom-rule");
});

test("a visitor already on the rule destination does not fall through when hide-without-destination is on", () => {
  const decision = see({
    currentUrl: "https://eu.example/shop/products/hat",
    hideWithoutDestination: true,
  });
  assert.equal(decision.show, false);
  assert.equal(decision.reason, "already-on-rule");
});

test("no rule and no other market hides when there is nowhere to send them", () => {
  const decision = see({
    country: "JP",
    destinations: {},
    availableCountries: ["US"],
    currentMarketCountries: ["US"],
    hideWithoutDestination: true,
  });
  assert.equal(decision.show, false);
  assert.equal(decision.reason, "nowhere");
});

test("no rule and another market still shows when there is nowhere else would have hidden a dead end", () => {
  const decision = see({
    country: "CA",
    destinations: {},
    hideWithoutDestination: true,
    hideInCurrentMarket: true,
  });
  assert.equal(decision.show, true);
  assert.equal(decision.reason, "other-market");
});

test("markets off removes the other-market destination", () => {
  const decision = see({
    country: "CA",
    destinations: {},
    marketsOn: false,
    hideWithoutDestination: true,
  });
  assert.equal(decision.show, false);
  assert.equal(decision.reason, "nowhere");
});

test("a failed lookup hides only when there is nowhere to send them", () => {
  assert.equal(plan.countryForVisibility("", "US", true), "");
  assert.equal(plan.countryForVisibility("", "US", false), "US");
  assert.equal(see({ country: "", hideWithoutDestination: true }).reason, "no-country");
  assert.equal(see({ country: "", destinations: {}, hideWithoutDestination: false }).show, true);
});

test("hide when already in this market stays quiet unless a rule points somewhere else", () => {
  const hidden = see({
    country: "US",
    destinations: {},
    currentMarketCountries: ["US"],
    hideInCurrentMarket: true,
  });
  assert.equal(hidden.show, false);
  assert.equal(hidden.reason, "current-market");
});

test("another domain is never already there, and a root rule covers the whole host", () => {
  assert.equal(plan.alreadyOnDestination(HERE, "https://eu.example/"), false);
  assert.equal(
    plan.alreadyOnDestination("https://www.eu.example/products/hat", "https://eu.example/"),
    true,
  );
  assert.equal(
    plan.alreadyOnDestination("https://shop.example/europe", "https://shop.example/eu"),
    false,
  );
});

test("confirm builds the rule url with the path, utm params, and the arrival marker", () => {
  const decision = plan.confirmAction({
    country: "FR",
    formCountry: "US",
    destinations: destinations(),
    marketsOn: true,
    availableCountries: ["US", "CA"],
    currentUrl: "https://shop.example/eu/products/Red-Shirt?utm_source=ads&ref=home",
    preserveRelativePath: true,
    localeRoot: "/",
    basePaths: ["/eu"],
  });
  assert.equal(decision.action, "rule");
  assert.equal(decision.url.startsWith("https://eu.example/shop/products/Red-Shirt"), true);
  assert.match(decision.url, /utm_source=ads/);
  assert.equal(decision.url.includes("ref="), false);
  assert.match(decision.url, /ece_sent=1/);
  assert.equal(decision.url.includes("zappid"), false);
});

test("preserve off keeps the rule url and still adds the arrival marker", () => {
  const decision = plan.confirmAction({
    country: "FR",
    formCountry: "US",
    destinations: destinations(),
    currentUrl: HERE,
    preserveRelativePath: false,
    localeRoot: "/",
    basePaths: ["/eu"],
  });
  assert.equal(decision.action, "rule");
  const url = new URL(decision.url);
  assert.equal(url.pathname, "/shop");
  assert.equal(url.searchParams.get("ece_sent"), "1");
});

test("a market confirm keeps the path only when preserve is on", () => {
  const shared = {
    country: "CA",
    formCountry: "US",
    destinations: {},
    marketsOn: true,
    availableCountries: ["US", "CA"],
    currentUrl: HERE,
    localeRoot: "/",
    basePaths: [],
  };
  const kept = plan.confirmAction({ ...shared, preserveRelativePath: true });
  assert.equal(kept.action, "market");
  assert.equal(kept.returnTo.startsWith("/products/red-tshirt?"), true);
  assert.match(kept.returnTo, /utm_source=ads/);
  assert.match(kept.returnTo, /ece_sent=1/);

  const home = plan.confirmAction({ ...shared, preserveRelativePath: false });
  assert.equal(home.returnTo, "/?ece_sent=1");
});

test("markets off does not submit a market switch, and the same country stays", () => {
  assert.equal(
    plan.confirmAction({
      country: "CA",
      formCountry: "US",
      destinations: {},
      marketsOn: false,
      availableCountries: ["US", "CA"],
      currentUrl: HERE,
      preserveRelativePath: false,
    }).action,
    "stay",
  );
  assert.equal(
    plan.confirmAction({
      country: "US",
      formCountry: "US",
      language: "en",
      formLanguage: "en",
      destinations: {},
      marketsOn: true,
      availableCountries: ["US"],
      currentUrl: HERE,
      preserveRelativePath: true,
    }).action,
    "stay",
  );
});

test("a language change on the same country still switches market language", () => {
  const decision = plan.confirmAction({
    country: "US",
    formCountry: "US",
    language: "fr",
    formLanguage: "en",
    destinations: {},
    marketsOn: true,
    availableCountries: ["US"],
    currentUrl: HERE,
    preserveRelativePath: false,
  });
  assert.equal(decision.action, "market");
  assert.equal(decision.language, "fr");
});

test("base path matching is case-insensitive and the remainder keeps its case", () => {
  assert.equal(
    plan.stripRoutingPrefixes("/EU/products/Red-Shirt", "/", ["/eu"]),
    "/products/Red-Shirt",
  );
  assert.equal(plan.stripRoutingPrefixes("/en-fr/eu/products/x", "/en-fr", ["/eu"]), "/products/x");
  assert.equal(plan.stripRoutingPrefixes("/", "/", ["/"]), "/");
});

test("the url whitelist locks the popup and the inverted list does not", () => {
  const locked = plan.popupUrlGate(HERE, ["/products/*"], []);
  assert.equal(locked.lock, true);
  assert.equal(locked.reason, "whitelist");
  const ignored = plan.popupUrlGate(HERE, [], ["https://other.example/*"]);
  assert.equal(ignored.hide, false);
  assert.equal(plan.popupUrlGate(HERE, ["*"], []).lock, true);
  assert.equal(plan.popupUrlGate(HERE, ["shop.example"], []).lock, true);
  assert.equal(
    plan.urlPatternMatches("/products/red-tshirt?utm_source=ads", HERE),
    true,
  );
  assert.equal(
    plan.urlPatternMatches("/products/red-tshirt?utm_source=email", HERE),
    false,
  );
});

test("an ip whitelist match hides, a failed lookup releases, and ipv6 does not throw", () => {
  assert.equal(plan.popupIpGate(["1.2.3.4"], "1.2.3.4", false).reason, "ip-whitelist");
  assert.equal(plan.popupIpGate(["1.2.3.4"], "", true).reason, "lookup-failed");
  assert.equal(plan.popupIpGate(["1.2.3.4"], "2001:db8::1", false).hide, false);
  assert.equal(plan.ipMatches(["2001:db8::1"], "2001:db8::1"), true);
  assert.equal(plan.popupIpGate([], "1.2.3.4", false).hide, false);
});

test("cookies and the arrival marker hide the popup", () => {
  assert.equal(plan.cookieHidesPopup({ kind: "confirm", closeCookie: "1" }), "close");
  assert.equal(plan.cookieHidesPopup({ kind: "confirm", confirmCookie: "1" }), "confirm");
  assert.equal(
    plan.cookieHidesPopup({ kind: "confirm", selectorCookie: "1" }),
    "",
  );
  assert.equal(
    plan.cookieHidesPopup({ kind: "selector", selectorCookie: "1" }),
    "selector",
  );
  assert.equal(plan.hasArrivalMarker("?ece_sent=1"), true);
  assert.equal(plan.hasArrivalMarker("?skipautoredirect=1"), false);
  const selector = plan.arrivalEffect("selector");
  assert.equal(selector.setConfirmCookie, true);
  assert.equal(selector.confirmMinutes, 30);
  assert.equal(selector.stripAfterMs, 300000);
  assert.equal(plan.arrivalEffect("confirm").setConfirmCookie, false);
});

test("selector rows keep one country and drop market rows when markets are off", () => {
  const markets = [
    { code: "FR", name: "France", currency: { code: "EUR", symbol: "€" } },
    { code: "US", name: "United States", currency: { code: "USD", symbol: "$" } },
  ];
  const both = plan.selectorOptions({
    marketCountries: markets,
    destinations: destinations(),
    marketsOn: true,
    nameFor: (code) => code,
  });
  const france = both.filter((item) => item.code === "FR");
  assert.equal(france.length, 1);
  assert.equal(france[0].source, "rule");
  assert.equal(both.some((item) => item.code === "US"), true);
  assert.equal(both.some((item) => item.code === "DE"), true);

  const rulesOnly = plan.selectorOptions({
    marketCountries: markets,
    destinations: destinations(),
    marketsOn: false,
    nameFor: (code) => code,
  });
  assert.equal(Array.from(rulesOnly, (item) => item.code).join(","), "DE,FR");
});

test("the theme editor can preview the popup or render nothing", () => {
  assert.equal(plan.editorMode(false, true), "store");
  assert.equal(plan.editorMode(true, false), "preview");
  assert.equal(plan.editorMode(true, true), "nothing");
});

test("the published map has one url per country and a later duplicate wins", () => {
  const map = plan.compileDestinationMap([
    { country_code: ["FR"], url: "https://first.example/" },
    { country_code: ["FR"], url: "https://second.example/" },
  ]);
  assert.equal(map.FR, "https://second.example/");
});
