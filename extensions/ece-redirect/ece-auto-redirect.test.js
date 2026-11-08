/* eslint-env node */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createContext, runInContext } from "node:vm";
import { isMarketsRoutingOn } from "../../app/components/ece/eceRuleModel.js";

const context = {
  console,
  URL,
  URLSearchParams,
};
context.globalThis = context;
createContext(context);
runInContext(
  readFileSync(new URL("./assets/ece-auto-redirect.js", import.meta.url), "utf8"),
  context,
);
const plan = context.EceAutoRedirectPlan;

const HERE = "https://shop.example/products/red-tshirt?utm_source=ads&ref=home";
const RULES = [
  {
    name: "EU store",
    country_code: ["FR", "DE"],
    url: "https://eu.example/shop",
  },
];

function decide(overrides) {
  const destinations = plan.compileDestinationMap(
    overrides.rules === undefined ? RULES : overrides.rules,
  );
  return plan.getGeoRedirectPlan({
    country: "FR",
    ip: "1.2.3.4",
    whitelistedIps: [],
    currentUrl: HERE,
    marketsOn: true,
    currentMarketCountries: ["US"],
    formCountry: "US",
    availableCountries: ["US", "CA", "DE"],
    preserveRelativePath: false,
    localeRoot: "/",
    basePaths: [],
    ...overrides,
    destinations: overrides.destinations || destinations,
  });
}

test("custom rule wins over markets when the visitor is not already there", () => {
  const decision = decide({});
  assert.equal(decision.action, "rule");
  assert.equal(decision.reason, "custom-rule");
  assert.equal(decision.url.startsWith("https://eu.example/shop"), true);
  assert.match(decision.url, /utm_source=ads/);
  assert.equal(decision.url.includes("ref="), false);
  assert.equal(decision.url.includes("zappid"), false);
});

test("a visitor already on the rule host and path does not fall through to markets", () => {
  const decision = decide({
    currentUrl: "https://eu.example/shop/products/hat",
  });
  assert.equal(decision.action, "stop");
  assert.equal(decision.reason, "already-on-rule");
});

test("another domain is never already there", () => {
  assert.equal(plan.alreadyOnDestination(HERE, "https://eu.example/"), false);
});

test("a rule path of / counts every page on that host as already there", () => {
  assert.equal(
    plan.alreadyOnDestination(
      "https://www.eu.example/products/hat",
      "https://eu.example/",
    ),
    true,
  );
});

test("a folder path does not treat a longer sibling as the same destination", () => {
  assert.equal(
    plan.alreadyOnDestination("https://shop.example/europe", "https://shop.example/eu"),
    false,
  );
  assert.equal(
    plan.alreadyOnDestination(
      "https://shop.example/eu/products",
      "https://shop.example/eu",
    ),
    true,
  );
});

test("www and default ports are ignored for the destination host", () => {
  assert.equal(
    plan.alreadyOnDestination(
      "https://www.eu.example:443/shop",
      "http://eu.example/shop",
    ),
    true,
  );
});

test("no rules and markets on submits the localization form for another market", () => {
  const decision = decide({
    rules: [],
    country: "CA",
    availableCountries: ["US", "CA"],
    currentMarketCountries: ["US"],
    formCountry: "US",
  });
  assert.equal(decision.action, "market");
  assert.equal(decision.country, "CA");
  assert.equal(decision.returnTo, "/products/red-tshirt?utm_source=ads&ref=home");
});

test("no rules and markets off does not redirect", () => {
  const decision = decide({ rules: [], country: "CA", marketsOn: false });
  assert.equal(decision.reason, "markets-off");
});

test("a rule still wins when markets routing is off", () => {
  assert.equal(decide({ marketsOn: false }).action, "rule");
});

test("the current market stops before a market switch", () => {
  const decision = decide({
    rules: [],
    country: "DE",
    currentMarketCountries: ["FR", "DE"],
    formCountry: "FR",
    availableCountries: ["FR", "DE"],
  });
  assert.equal(decision.reason, "current-market");
});

test("the same form country stops", () => {
  const decision = decide({
    rules: [],
    country: "us",
    currentMarketCountries: [],
    formCountry: "US",
    availableCountries: ["US"],
  });
  assert.equal(decision.reason, "form-country");
});

test("a country outside markets and rules stops", () => {
  assert.equal(decide({ rules: [], country: "JP" }).reason, "nowhere");
});

test("a whitelisted IP does not redirect", () => {
  assert.equal(
    decide({ ip: "1.2.3.4", whitelistedIps: ["1.2.3.4"] }).reason,
    "ip-whitelist",
  );
});

test("a missing IP does not match the whitelist, so a rule can still run", () => {
  assert.equal(decide({ ip: "" , whitelistedIps: ["1.2.3.4"] }).action, "rule");
});

test("an IPv6 whitelist comparison does not throw", () => {
  assert.equal(plan.ipMatches(["2001:db8::1"], "2001:DB8::1"), true);
  assert.equal(plan.ipMatches(["10.0.0.0/8", "not-an-ip"], "2001:db8::2"), false);
});

test("no country does not redirect", () => {
  assert.equal(decide({ country: "" }).reason, "no-country");
});

test("an invalid rule URL does not fall through to markets", () => {
  const decision = decide({
    rules: [{ country_code: ["FR"], url: "https://" }],
  });
  assert.equal(decision.reason, "invalid-destination");
});

test("the later rule wins when one country is published twice", () => {
  const map = plan.compileDestinationMap([
    { country_code: ["FR"], url: "https://first.example/" },
    { country_code: "FR, DE", url: "https://second.example/de" },
  ]);
  assert.equal(map.FR, "https://second.example/de");
  assert.equal(map.DE, "https://second.example/de");
});

test("a loose map and a JSON object both compile", () => {
  const loose = plan.compileDestinationMap("{FR:https://eu.example.com,DE:https://eu.example.com/de}");
  assert.equal(loose.FR, "https://eu.example.com/");
  assert.equal(loose.DE, "https://eu.example.com/de");
  const json = plan.compileDestinationMap('{"fr":"https://eu.example/fr"}');
  assert.equal(json.FR, "https://eu.example/fr");
});

test("preserve relative path strips locale and base paths in either order", () => {
  const left = plan.stripRoutingPrefixes("/eu/en-fr/products/Red", "/en-fr", ["/eu"]);
  const right = plan.stripRoutingPrefixes("/en-fr/eu/products/Red", "/en-fr/", ["https://shop.example/eu?x=1"]);
  assert.equal(left, "/products/Red");
  assert.equal(right, "/products/Red");
});

test("base path / is ignored and matching keeps the remainder case", () => {
  assert.equal(
    plan.stripRoutingPrefixes("/EU/Products/Hat", "/", ["/", "/eu"]),
    "/Products/Hat",
  );
});

test("preserve off keeps the rule URL and only adds utm params", () => {
  const url = plan.buildRuleUrl("https://eu.example/shop#details", {
    preserveRelativePath: false,
    currentUrl: "https://shop.example/products/hat?utm_campaign=spring&cart=1",
    localeRoot: "/en-fr",
    basePaths: ["/eu"],
  });
  assert.equal(url, "https://eu.example/shop?utm_campaign=spring#details");
});

test("preserve on joins the stripped path onto the destination", () => {
  const url = plan.buildRuleUrl("https://abc.example", {
    preserveRelativePath: true,
    currentUrl: "https://xyz.example/eu/products/red-tshirt",
    localeRoot: "/",
    basePaths: ["/eu"],
  });
  assert.equal(url, "https://abc.example/products/red-tshirt");
});

test("url gates skip whitelist matches and require inverted matches", () => {
  assert.equal(plan.passesUrlGates("https://shop.example/a", ["*"], []).reason, "whitelist");
  assert.equal(
    plan.passesUrlGates("https://www.shop.example/pages/about", ["shop.example"], []).reason,
    "whitelist",
  );
  assert.equal(
    plan.passesUrlGates("https://other.example/pages/about", ["https://shop.example/pages/about"], [])
      .ok,
    true,
  );
  assert.equal(
    plan.passesUrlGates("https://shop.example/pages/about?x=1&y=2", ["/pages/about?x=1"], []).reason,
    "whitelist",
  );
  assert.equal(
    plan.passesUrlGates("https://shop.example/pages/about?y=2", ["/pages/about?x=1"], []).ok,
    true,
  );
  assert.equal(
    plan.passesUrlGates("https://shop.example/products/hat", ["/products*"], []).reason,
    "whitelist",
  );
  assert.equal(
    plan.passesUrlGates("https://shop.example/products-sale", ["/products*"], []).ok,
    true,
  );
  assert.equal(plan.passesUrlGates("https://shop.example/a", [], []).ok, true);
  assert.equal(
    plan.passesUrlGates("https://shop.example/a", [], ["https://shop.example/b"]).reason,
    "inverted",
  );
  assert.equal(
    plan.passesUrlGates("https://shop.example/b/child", [], ["https://shop.example/b/"]).ok,
    true,
  );
});

test("stop rules run before a plan", () => {
  assert.equal(plan.hasSkipFlag("?preview=1&SkipAutoRedirect=1"), true);
  assert.equal(
    plan.precheck({
      search: "?skipautoredirect=1",
      currentUrl: HERE,
      whitelistedUrls: [],
      reverseWhitelistedUrls: [],
    }).reason,
    "skip",
  );
  assert.equal(plan.precheck({ search: "", designMode: true, currentUrl: HERE }).reason, "editor");
  assert.equal(
    plan.precheck({
      search: "",
      currentUrl: HERE,
      whitelistedUrls: ["/products*"],
      reverseWhitelistedUrls: [],
    }).reason,
    "whitelist",
  );
  assert.equal(
    plan.precheck({
      search: "",
      currentUrl: HERE,
      whitelistedUrls: [],
      reverseWhitelistedUrls: ["https://other.example/"],
    }).reason,
    "inverted",
  );
  const now = Date.now();
  assert.equal(
    plan.precheck({
      search: "",
      currentUrl: HERE,
      whitelistedUrls: [],
      reverseWhitelistedUrls: [],
      enabled: true,
      minutes: 60,
      now,
      cookie: String(now - 1000),
      storage: "",
    }).reason,
    "once",
  );
  assert.equal(
    plan.cooldownActive({ enabled: true, minutes: 60, now, cookie: "true", storage: "" }),
    true,
  );
  assert.equal(
    plan.cooldownActive({
      enabled: true,
      minutes: 60,
      now,
      cookie: "",
      storage: String(now - 61 * 60 * 1000),
    }),
    false,
  );
  assert.equal(
    plan.cooldownActive({ enabled: false, minutes: 60, now, cookie: "true", storage: "true" }),
    false,
  );
  assert.equal(plan.cooldownMinutes(0), 1);
  assert.equal(plan.cooldownMinutes("nope"), 60);
  assert.equal(
    plan.precheck({
      search: "",
      currentUrl: HERE,
      whitelistedUrls: [],
      reverseWhitelistedUrls: [],
      inFlight: true,
    }).reason,
    "in-flight",
  );
});

test("crawlers are confirmed, while phone and console agents are not", () => {
  assert.equal(plan.isCrawler("Mozilla/5.0 Googlebot/2.1"), true);
  assert.equal(plan.isCrawler("curl/8.0"), true);
  assert.equal(plan.isCrawler("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)"), false);
  assert.equal(plan.isCrawler("Mozilla/5.0 (PlayStation 5) Bot"), false);
});

test("markets routing matches the admin field", () => {
  for (const value of [null, "", "on", "1", "{PinstaMarket:1}", "off", "0", "{PinstaMarket:0}"]) {
    assert.equal(plan.marketsRoutingOn(value), isMarketsRoutingOn(value));
  }
  assert.equal(plan.marketsRoutingOn("off"), false);
  assert.equal(isMarketsRoutingOn("off"), false);
  assert.equal(plan.marketsRoutingOn(null), true);
});
