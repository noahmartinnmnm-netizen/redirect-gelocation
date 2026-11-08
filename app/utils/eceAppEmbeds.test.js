/* eslint-env node */
import assert from "node:assert/strict";
import test from "node:test";
import {
  embedsWithThemeStatus,
  isThemeEmbedActive,
  parseThemeSettings,
} from "./eceAppEmbeds.server.js";

const EMBEDS = [
  {
    id: "ece-embed-popup",
    label: "Confirmation popup",
    active: true,
  },
  {
    id: "ece-embed-auto",
    label: "Automatic redirect",
    active: false,
  },
  {
    id: "ece-embed-switcher",
    label: "Floating switcher",
    active: true,
  },
];

function settings(blocks, current = null) {
  const body = {
    current: current === null ? { blocks } : current,
    presets: {
      Default: { blocks },
    },
  };
  return `/*\n * auto-generated\n */\n${JSON.stringify(body)}`;
}

const ENABLED = {
  "111": {
    type: "shopify://apps/redirect-location/blocks/auto-redirect/uuid",
    disabled: false,
    settings: {},
  },
};

test("an enabled automatic redirect block is active", () => {
  const result = embedsWithThemeStatus(EMBEDS, settings(ENABLED));
  assert.equal(result.find((embed) => embed.id === "ece-embed-auto").active, true);
  assert.equal(result.find((embed) => embed.id === "ece-embed-popup").active, false);
  assert.equal(result.find((embed) => embed.id === "ece-embed-switcher").active, false);
});

test("a disabled automatic redirect block is inactive", () => {
  const blocks = {
    "111": { ...ENABLED["111"], disabled: true },
  };
  const result = embedsWithThemeStatus(EMBEDS, settings(blocks));
  assert.equal(result.find((embed) => embed.id === "ece-embed-auto").active, false);
});

test("a missing disabled flag counts as active", () => {
  const blocks = {
    "111": {
      type: "shopify://apps/ece-redirect/blocks/auto-redirect/0bf29b70",
      settings: {},
    },
  };
  assert.equal(isThemeEmbedActive(blocks, "auto-redirect"), true);
});

test("current can be a preset name", () => {
  const raw = settings(ENABLED, "Default");
  const parsed = parseThemeSettings(raw);
  assert.equal(parsed.ok, true);
  assert.equal(isThemeEmbedActive(parsed.blocks, "auto-redirect"), true);
});

test("a block that is not this embed does not activate it", () => {
  const blocks = {
    "111": {
      type: "shopify://apps/other/blocks/app_embed_market_settings/uuid",
      disabled: false,
    },
  };
  assert.equal(isThemeEmbedActive(blocks, "auto-redirect"), false);
});

test("invalid theme json shows every embed inactive", () => {
  const result = embedsWithThemeStatus(EMBEDS, "not json");
  assert.deepEqual(
    result.map((embed) => embed.active),
    [false, false, false],
  );
});

test("one enabled copy keeps automatic redirect active when another copy is disabled", () => {
  const blocks = {
    off: { ...ENABLED["111"], disabled: true },
    on: {
      type: "shopify://apps/redirect-location/blocks/auto-redirect/other",
      disabled: false,
    },
  };
  assert.equal(isThemeEmbedActive(blocks, "auto-redirect"), true);
});
