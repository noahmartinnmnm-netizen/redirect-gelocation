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
  Array,
  Object,
  String,
  Boolean,
  Number,
  JSON,
  Math,
  Error,
};
context.globalThis = context;
createContext(context);
runInContext(
  readFileSync(new URL("./assets/ece-floating-selector.js", import.meta.url), "utf8"),
  context,
);
const plan = context.EceFloatingSelectorPlan;

const RULES = [
  {
    name: "EU store",
    country_code: ["FR", "DE"],
    url: "https://eu.example/shop",
  },
];

const MARKET = [
  { code: "US", name: "United States", currency: { code: "USD", symbol: "$" } },
  { code: "FR", name: "France", currency: { code: "EUR", symbol: "€" } },
  { code: "CA", name: "Canada", currency: { code: "CAD", symbol: "$" } },
];

test("the floating selector embed ships as a body app embed with theme settings", () => {
  const liquid = readFileSync(
    new URL("./blocks/floating-selector.liquid", import.meta.url),
    "utf8",
  );
  assert.match(liquid, /"target": "body"/);
  assert.match(liquid, /"javascript": "ece-floating-selector\.js"/);
  assert.match(liquid, /shop\.metafields\.ece\.rule_country/);
  assert.match(liquid, /shop\.metafields\.ece\.markets_routing/);
  assert.match(liquid, /"id": "position"/);
  assert.match(liquid, /"id": "show_country"/);
  assert.match(liquid, /"id": "show_language"/);
  assert.match(liquid, /"id": "pill_background"/);
  assert.equal(liquid.includes("whitelisted_urls"), false);
});

test("rule-only countries are inserted and markets-off hides non-rule countries", () => {
  const destinations = plan.compileDestinationMap(RULES);
  const marketsOn = plan.buildCountryEntries({
    marketCountries: MARKET,
    destinations,
    marketsOn: true,
  });
  assert.deepEqual(
    marketsOn.map((item) => `${item.code}:${item.source}`),
    ["CA:market", "DE:rule", "FR:rule", "US:market"],
  );

  const marketsOff = plan.buildCountryEntries({
    marketCountries: MARKET,
    destinations,
    marketsOn: false,
  });
  assert.deepEqual(
    marketsOff.map((item) => item.code),
    ["DE", "FR"],
  );
});

test("a market country that also has a rule uses the rule URL", () => {
  const destinations = plan.compileDestinationMap(RULES);
  const action = plan.pickCountryAction({
    country: "FR",
    source: "rule",
    destinations,
    currentUrl: "https://shop.example/products/hat?utm_source=ads&ref=x",
  });
  assert.equal(action.action, "rule");
  assert.match(action.url, /^https:\/\/eu\.example\/shop/);
  assert.match(action.url, /ece_sent=1/);
  assert.match(action.url, /utm_source=ads/);
  assert.equal(action.url.includes("ref="), false);
});

test("floating rule hops do not preserve the relative path", () => {
  const url = plan.buildFloatingRedirectUrl(
    "https://eu.example/shop",
    "https://shop.example/eu/products/red-tshirt?utm_campaign=spring",
  );
  assert.equal(url.startsWith("https://eu.example/shop?"), true);
  assert.equal(url.includes("/products/red-tshirt"), false);
  assert.match(url, /utm_campaign=spring/);
  assert.match(url, /ece_sent=1/);
});

test("market country links keep the current path and add the arrival marker", () => {
  const url = plan.buildMarketCountryUrl(
    "CA",
    "https://shop.example/collections/all?page=2",
    "/",
  );
  assert.match(url, /\/collections\/all/);
  assert.match(url, /country=CA/);
  assert.match(url, /ece_sent=1/);
  assert.match(url, /page=2/);
});

test("search matches country name or code", () => {
  const list = plan.buildCountryEntries({
    marketCountries: MARKET,
    destinations: {},
    marketsOn: true,
  });
  assert.deepEqual(
    plan.filterCountries(list, "can").map((item) => item.code),
    ["CA"],
  );
  assert.deepEqual(
    plan.filterCountries(list, "us").map((item) => item.code),
    ["US"],
  );
});

test("surface white and 8-digit white or black become transparent", () => {
  assert.equal(plan.sanitizeColor("#ffffff", "#111", { role: "surface" }), "transparent");
  assert.equal(plan.sanitizeColor("white", "#111", { role: "surface" }), "transparent");
  assert.equal(plan.sanitizeColor("transparent", "#111", { role: "surface" }), "transparent");
  assert.equal(plan.sanitizeColor("#ffffffff", "#111", { role: "surface" }), "transparent");
  assert.equal(plan.sanitizeColor("#00000000", "#111", { role: "surface" }), "transparent");
  assert.equal(plan.sanitizeColor("#000000ff", "#111", { role: "surface" }), "transparent");
  assert.equal(plan.sanitizeColor("#ffffff", "#111", { role: "text" }), "#ffffff");
  assert.equal(plan.sanitizeColor("#0f766e", "#111", { role: "surface" }), "#0f766e");
});

test("positions normalize to the four supported corners", () => {
  assert.equal(plan.normalizePosition("bottom left"), "bottom-left");
  assert.equal(plan.normalizePosition("topright"), "top-right");
  assert.equal(plan.normalizePosition("nope"), "bottom-left");
});

test("markets routing off matches the published text switch", () => {
  assert.equal(plan.marketsRoutingOn(null), true);
  assert.equal(plan.marketsRoutingOn("off"), false);
  assert.equal(plan.marketsRoutingOn("0"), false);
  assert.equal(plan.marketsRoutingOn("{PinstaMarket:0}"), false);
  assert.equal(plan.marketsRoutingOn("on"), true);
});

test("country and language labels honor display toggles", () => {
  assert.equal(
    plan.countryLabel(
      { code: "FR", name: "France" },
      { showCountryName: true, showCountryCode: true },
    ),
    "France · FR",
  );
  assert.equal(
    plan.currencyLabel(
      { code: "EUR", symbol: "€" },
      { showCurrencyCode: true, showCurrencySymbol: true },
    ),
    "EUR €",
  );
  assert.equal(
    plan.languageLabel({ code: "fr", name: "Français" }, { showLanguageName: false }),
    "FR",
  );
});
