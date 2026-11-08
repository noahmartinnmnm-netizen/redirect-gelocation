/* eslint-env node */
import assert from "node:assert/strict";
import test from "node:test";
import {
  ECE_POPUP_DESIGN_KEY,
  defaultPopupDesign,
  normalizePopupDesign,
  parseStoredPopupDesign,
  popupDesignDocument,
  popupDesignFingerprint,
} from "../components/ece/ecePopupDesigns.js";

const CONTENT_KEYS = ["heading", "message", "primaryButton", "secondaryButton"];
const STYLE_KEYS = [
  "width",
  "radius",
  "headingSize",
  "backdrop",
  "glass",
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
const PREFERENCE_KEYS = [
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
  "cookieMinutes",
  "headerImageUrl",
];

test("popup design metafield key is the liquid key pd_desgine", () => {
  assert.equal(ECE_POPUP_DESIGN_KEY, "pd_desgine");
});

test("saved document keeps every field the embed renders", () => {
  const design = defaultPopupDesign("ece-selector-passport");
  design.content.heading = "Hello --flag-- --country--";
  design.style.glass = true;
  design.style.width = 270;
  design.preferences.headerImageUrl = "//cdn.shopify.com/header.png";
  design.preferences.closeButton = "false";
  design.preferences.cookieMinutes = "45";

  const document = popupDesignDocument(design, "2026-10-14T12:00:00.000Z");
  assert.equal(document.version, 1);
  assert.equal(document.updatedAt, "2026-10-14T12:00:00.000Z");
  assert.equal(document.templateId, "ece-selector-passport");
  assert.equal(document.kind, "selector");
  assert.equal(document.name, "Passport");
  assert.deepEqual(document.tokens, { country: "--country--", flag: "--flag--" });
  assert.deepEqual(Object.keys(document.content), CONTENT_KEYS);
  assert.deepEqual(Object.keys(document.style), STYLE_KEYS);
  assert.deepEqual(Object.keys(document.preferences), PREFERENCE_KEYS);
  assert.equal(document.content.heading, "Hello --flag-- --country--");
  assert.equal(document.style.width, 27);
  assert.equal(document.style.glass, true);
  assert.equal(document.preferences.closeButton, false);
  assert.equal(document.preferences.cookieMinutes, 45);
  assert.equal(document.preferences.headerImageUrl, "https://cdn.shopify.com/header.png");

  const stored = JSON.parse(JSON.stringify(document));
  assert.equal(stored.preferences.closeButton, false);
  assert.equal(typeof stored.preferences.cookieMinutes, "number");
});

test("a blank metafield means nothing is published", () => {
  assert.deepEqual(parseStoredPopupDesign(null), { ok: true, design: null });
  assert.deepEqual(parseStoredPopupDesign("  "), { ok: true, design: null });
});

test("a stored document round-trips into the editor", () => {
  const document = popupDesignDocument(
    defaultPopupDesign("ece-confirm-spotlight"),
    "2026-10-14T12:00:00.000Z",
  );
  const parsed = parseStoredPopupDesign(JSON.stringify(document));
  assert.equal(parsed.ok, true);
  assert.equal(
    popupDesignFingerprint(parsed.design),
    popupDesignFingerprint(document),
  );
  assert.equal(popupDesignFingerprint(parsed.design).includes("updatedAt"), false);
});

test("changing one color changes the fingerprint", () => {
  const design = defaultPopupDesign("ece-confirm-spotlight");
  const before = popupDesignFingerprint(design);
  design.style.accent = "#112233";
  assert.notEqual(popupDesignFingerprint(design), before);
});

test("invalid image urls and unknown templates are rejected", () => {
  const design = defaultPopupDesign("ece-selector-passport");
  design.preferences.headerImageUrl = "javascript:alert(1)";
  const image = normalizePopupDesign(design);
  assert.equal(image.ok, false);

  const missing = normalizePopupDesign({ templateId: "missing" });
  assert.equal(missing.ok, false);

  const broken = parseStoredPopupDesign("{");
  assert.equal(broken.ok, false);
  assert.equal(broken.design, null);
});
