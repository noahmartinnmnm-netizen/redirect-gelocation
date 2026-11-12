import assert from "node:assert/strict";
import test from "node:test";
import { embedsFromAppExtensions } from "./eceThemeExtensions.js";

const EMBEDS = [
  { id: "ece-embed-auto", label: "Auto Redirect", active: false },
  { id: "ece-embed-popup", label: "Geolocation Popup", active: false },
  { id: "ece-embed-switcher", label: "Floating selector", active: true },
  { id: "ece-embed-blocker", label: "Country Blocker", active: false },
];

test("embedsFromAppExtensions maps active theme embeds from app.extensions()", () => {
  const next = embedsFromAppExtensions(EMBEDS, [
    {
      type: "theme_app_extension",
      handle: "ece-redirect",
      activations: [
        { handle: "auto-redirect", status: "active" },
        { handle: "redirect-popup", status: "available" },
        { handle: "floating-selector", status: "available" },
        { handle: "country-blocker", status: "active" },
      ],
    },
  ]);

  assert.equal(next.find((item) => item.id === "ece-embed-auto").active, true);
  assert.equal(next.find((item) => item.id === "ece-embed-popup").active, false);
  assert.equal(next.find((item) => item.id === "ece-embed-switcher").active, false);
  assert.equal(next.find((item) => item.id === "ece-embed-blocker").active, true);
});

test("embedsFromAppExtensions returns null when no theme activations exist", () => {
  assert.equal(embedsFromAppExtensions(EMBEDS, [{ type: "ui_extension", activations: [] }]), null);
  assert.equal(embedsFromAppExtensions(EMBEDS, []), null);
});
