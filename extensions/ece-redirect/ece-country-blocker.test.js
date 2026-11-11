/* eslint-env node */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createContext, runInContext } from "node:vm";

const context = { console, URL, URLSearchParams };
context.globalThis = context;
createContext(context);
runInContext(
  readFileSync(new URL("./assets/ece-country-blocker.js", import.meta.url), "utf8"),
  context,
);
const plan = context.EceCountryBlockerPlan;

function decide(overrides) {
  return JSON.parse(
    JSON.stringify(
      plan.decideBlock({
        lookupOk: true,
        country: "FR",
        ip: "203.0.113.10",
        blockedCountries: [],
        blockedIps: [],
        blockedIpRanges: [],
        whitelistedIps: [],
        ...overrides,
      }),
    ),
  );
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("the country blocker embed reads the ece shop metafield", () => {
  const liquid = readFileSync(
    new URL("./blocks/country-blocker.liquid", import.meta.url),
    "utf8",
  );
  assert.match(liquid, /shop\.metafields\.ece\.ece_country_blocker/);
  assert.match(liquid, /shop\.metafields\.ece\.whitelisted_ips/);
  assert.equal(plan.fallbackDesign.templateId, "ece-blocker-default");
});

test("a failed lookup does not block", () => {
  assert.deepEqual(
    decide({ lookupOk: false, blockedCountries: ["FR"], blockedIps: ["203.0.113.10"] }),
    { block: false, reason: "lookup" },
  );
});

test("an allowed IP is let through even when the country and IP are blocked", () => {
  assert.deepEqual(
    decide({
      blockedCountries: ["fr"],
      blockedIps: ["203.0.113.10"],
      whitelistedIps: ["203.0.113.10"],
    }),
    { block: false, reason: "whitelist" },
  );
});

test("country matching ignores letter case", () => {
  assert.deepEqual(decide({ country: "fr", blockedCountries: ["FR"] }), {
    block: true,
    reason: "country",
  });
});

test("a listed IP is blocked and an IPv6 range check does not throw", () => {
  assert.deepEqual(decide({ blockedIps: ["01.2.3.4"], ip: "1.2.3.4", country: "" }), {
    block: true,
    reason: "ip",
  });
  assert.deepEqual(
    decide({
      country: "",
      ip: "2001:db8::10",
      blockedIpRanges: ["2001:db8::/32", "not-a-range", "10.0.0.0/99"],
    }),
    { block: false, reason: "allow" },
  );
});

test("CIDR and dash ranges are inclusive and a reversed range does not match", () => {
  assert.equal(decide({ country: "", ip: "10.1.2.3", blockedIpRanges: ["10.0.0.0/8"] }).reason, "range");
  assert.equal(decide({ country: "", ip: "11.0.0.1", blockedIpRanges: ["10.0.0.0/8"] }).reason, "allow");
  assert.equal(
    decide({ country: "", ip: "203.0.113.1", blockedIpRanges: ["203.0.113.1-203.0.113.20"] }).reason,
    "range",
  );
  assert.equal(
    decide({ country: "", ip: "203.0.113.20", blockedIpRanges: ["203.0.113.1-203.0.113.20"] }).reason,
    "range",
  );
  assert.equal(
    decide({ country: "", ip: "203.0.113.21", blockedIpRanges: ["203.0.113.1-203.0.113.20"] }).reason,
    "allow",
  );
  assert.equal(
    decide({ country: "", ip: "203.0.113.10", blockedIpRanges: ["203.0.113.20-203.0.113.1"] }).reason,
    "allow",
  );
  assert.equal(plan.ipv4ToLong("255.255.255.255"), 4294967295);
});

test("geo payloads keep a country when the first lookup has no IP", () => {
  assert.deepEqual(
    plain(plan.readPrimary({ success: true, country: "DE", visitor_ip: "198.51.100.8" })),
    { country: "DE", ip: "198.51.100.8" },
  );
  assert.equal(plan.readPrimary({ success: false, country: "DE" }), null);
  assert.deepEqual(plain(plan.readFallback({ country: "DE", ip: "198.51.100.9" })), {
    country: "DE",
    ip: "198.51.100.9",
  });
  assert.deepEqual(
    plain(plan.mergeVisitor({ country: "DE", ip: "" }, { country: "FR", ip: "198.51.100.9" })),
    { lookupOk: true, country: "DE", ip: "198.51.100.9" },
  );
  assert.equal(plan.mergeVisitor(null, null).lookupOk, false);
  assert.equal(plan.needsIpLookup({ blockedIps: [], blockedIpRanges: ["10.0.0.0/8"], whitelistedIps: [] }), true);
  assert.equal(plan.needsIpLookup({ blockedCountries: ["FR"] }), false);
});
