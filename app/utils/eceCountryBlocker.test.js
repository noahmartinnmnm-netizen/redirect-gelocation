/* eslint-env node */
import assert from "node:assert/strict";
import test from "node:test";
import {
  ECE_BLOCKER_TEMPLATES,
  ECE_COUNTRY_BLOCKER_KEY,
  ECE_COUNTRY_BLOCKER_NAME,
  applyBlockerPatch,
  countryBlockerDocument,
  defaultBlockerDesign,
  normalizeBlockerDesign,
  normalizeIpv4List,
  normalizeRangeList,
  normalizeWhitelist,
  parseStoredCountryBlocker,
} from "../components/ece/eceCountryBlocker.js";

test("country blocker metafield name and key start with the ece alias", () => {
  assert.equal(ECE_COUNTRY_BLOCKER_KEY, "ece_country_blocker");
  assert.equal(ECE_COUNTRY_BLOCKER_KEY.startsWith("ece"), true);
  assert.equal(ECE_COUNTRY_BLOCKER_NAME, "ece country blocker");
  assert.equal(ECE_COUNTRY_BLOCKER_NAME.startsWith("ece"), true);
});

test("the blocker has three designs", () => {
  assert.deepEqual(
    ECE_BLOCKER_TEMPLATES.map((template) => template.name),
    ["Default", "Modern", "Futuristic"],
  );
});

test("heading size and panel width stay inside the blocker limits", () => {
  const design = defaultBlockerDesign("ece-blocker-modern");
  design.style.headingSize = 90;
  design.style.maxWidth = 80;
  const normalized = normalizeBlockerDesign(design);
  assert.equal(normalized.ok, true);
  assert.equal(normalized.design.style.headingSize, 48);
  assert.equal(normalized.design.style.maxWidth, 300);

  design.style.headingSize = 8;
  design.style.maxWidth = 2000;
  const clamped = normalizeBlockerDesign(design);
  assert.equal(clamped.design.style.headingSize, 16);
  assert.equal(clamped.design.style.maxWidth, 800);
});

test("blocked IPv4 addresses require octets from 0 to 255 and reject duplicates", () => {
  assert.equal(normalizeIpv4List(["999.1.1.1"]).ok, false);
  assert.equal(normalizeIpv4List(["203.0.113.10"]).ok, true);
  assert.deepEqual(normalizeIpv4List(["01.2.3.4"]).list, ["1.2.3.4"]);
  assert.equal(normalizeIpv4List(["203.0.113.10", "203.0.113.10"]).ok, false);
  assert.equal(normalizeIpv4List(["2001:db8::1"]).ok, false);
});

test("IP ranges accept a dash or a CIDR mask from 0 to 32", () => {
  assert.equal(normalizeRangeList(["203.0.113.0/33"]).ok, false);
  assert.deepEqual(normalizeRangeList(["203.0.113.0/08"]).list, ["203.0.113.0/8"]);
  assert.deepEqual(normalizeRangeList(["203.0.113.1 - 203.0.113.20"]).list, [
    "203.0.113.1-203.0.113.20",
  ]);
  assert.equal(normalizeRangeList(["203.0.113.20-203.0.113.1"]).ok, false);
  assert.equal(normalizeRangeList(["203.0.113.1-203.0.113.1"]).ok, true);
});

test("the shared whitelist can keep an IPv6 address", () => {
  const saved = normalizeWhitelist(["203.0.113.10", "2001:db8::1"]);
  assert.equal(saved.ok, true);
  assert.deepEqual(saved.list, ["203.0.113.10", "2001:db8::1"]);
});

test("a blank metafield means the blocker is not published", () => {
  assert.deepEqual(parseStoredCountryBlocker(null), { ok: true, blocker: null });
  assert.deepEqual(parseStoredCountryBlocker("  "), { ok: true, blocker: null });
});

test("a stored document round-trips and a country save keeps the other lists", () => {
  const design = defaultBlockerDesign("ece-blocker-futuristic");
  design.content.heading = "Hold on";
  const created = applyBlockerPatch(null, { intent: "design", design });
  assert.equal(created.ok, true);
  const withCountries = applyBlockerPatch(created.blocker, {
    intent: "countries",
    countries: ["fr", "DE", "fr"],
  });
  const withIps = applyBlockerPatch(withCountries.blocker, {
    intent: "ips",
    ips: ["198.51.100.8"],
  });
  const document = countryBlockerDocument(withIps.blocker, "2026-11-08T04:00:00.000Z");
  assert.equal(document.version, 1);
  assert.equal(document.updatedAt, "2026-11-08T04:00:00.000Z");
  assert.equal(document.design.templateId, "ece-blocker-futuristic");
  assert.equal(document.design.name, "Futuristic");
  assert.deepEqual(document.blockedCountries, ["FR", "DE"]);
  assert.deepEqual(document.blockedIps, ["198.51.100.8"]);

  const parsed = parseStoredCountryBlocker(JSON.stringify(document));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.blocker.design.content.heading, "Hold on");
  assert.deepEqual(parsed.blocker.blockedCountries, ["FR", "DE"]);

  const replaced = applyBlockerPatch(parsed.blocker, {
    intent: "countries",
    countries: ["US"],
  });
  assert.deepEqual(replaced.blocker.blockedCountries, ["US"]);
  assert.deepEqual(replaced.blocker.blockedIps, ["198.51.100.8"]);
  assert.equal(replaced.blocker.design.templateId, "ece-blocker-futuristic");
});

test("an unknown design and a broken metafield are rejected", () => {
  assert.equal(normalizeBlockerDesign({ templateId: "missing" }).ok, false);
  const broken = parseStoredCountryBlocker("{");
  assert.equal(broken.ok, false);
  assert.equal(broken.blocker, null);
});

test("a country code that is not two letters is dropped on read and rejected on save", () => {
  const parsed = parseStoredCountryBlocker({
    design: null,
    blockedCountries: ["FR", "France", "ZZ"],
    blockedIps: ["999.1.1.1", "203.0.113.4"],
    blockedIpRanges: ["10.0.0.0/99"],
    whitelistedIps: [],
  });
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.blocker.blockedCountries, ["FR", "ZZ"]);
  assert.deepEqual(parsed.blocker.blockedIps, ["203.0.113.4"]);
  assert.deepEqual(parsed.blocker.blockedIpRanges, []);

  const saved = applyBlockerPatch(parsed.blocker, {
    intent: "countries",
    countries: ["US", "United States"],
  });
  assert.equal(saved.ok, false);
});
