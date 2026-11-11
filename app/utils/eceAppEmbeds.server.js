const ECE_THEME_SETTINGS_QUERY = `#graphql
  query EceMainThemeSettings {
    themes(first: 1, roles: [MAIN]) {
      nodes {
        id
        files(filenames: ["config/settings_data.json"]) {
          nodes {
            filename
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
          }
        }
      }
    }
  }
`;

/** Theme app-embed handles this admin can detect. */
export const ECE_THEME_EMBED_HANDLES = {
  "ece-embed-popup": "redirect-popup",
  "ece-embed-auto": "auto-redirect",
  "ece-embed-switcher": "floating-selector",
  "ece-embed-blocker": "country-blocker",
};

export function stripThemeSettingsComments(raw) {
  return String(raw ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

export function currentThemeBlocks(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return {};
  }

  let current = settings.current;
  if (typeof current === "string") {
    const presets = settings.presets;
    current =
      presets && typeof presets === "object" && !Array.isArray(presets)
        ? presets[current]
        : null;
  }

  if (!current || typeof current !== "object" || Array.isArray(current)) {
    return {};
  }

  const blocks = current.blocks;
  if (!blocks || typeof blocks !== "object" || Array.isArray(blocks)) {
    return {};
  }

  return blocks;
}

export function parseThemeSettings(raw) {
  const stripped = stripThemeSettingsComments(raw);
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) return { ok: false, blocks: {} };

  try {
    const settings = JSON.parse(stripped.slice(start, end + 1));
    return { ok: true, blocks: currentThemeBlocks(settings) };
  } catch {
    return { ok: false, blocks: {} };
  }
}

export function isThemeEmbedActive(blocks, handle) {
  const needle = `/blocks/${String(handle || "").toLowerCase()}/`;
  if (!handle || needle === "/blocks//") return false;

  return Object.values(blocks || {}).some((block) => {
    if (!block || typeof block !== "object") return false;
    const type = String(block.type || "").toLowerCase();
    if (!type.includes(needle)) return false;
    return block.disabled !== true && block.disabled !== "true";
  });
}

export function embedsWithThemeStatus(embeds, settingsText) {
  const parsed = parseThemeSettings(settingsText);
  return (embeds || []).map((embed) => {
    const handle = ECE_THEME_EMBED_HANDLES[embed.id];
    return {
      ...embed,
      active: Boolean(
        parsed.ok && handle && isThemeEmbedActive(parsed.blocks, handle),
      ),
    };
  });
}

function themesErrorText(error) {
  const parts = [];
  if (typeof error === "string") parts.push(error);
  if (error?.message) parts.push(error.message);
  const graphQLErrors = [
    ...(error?.body?.errors?.graphQLErrors ?? []),
    ...(error?.errors?.graphQLErrors ?? []),
    ...(error?.cause?.graphQLErrors ?? []),
  ];
  for (const item of graphQLErrors) {
    if (item?.message) parts.push(item.message);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function isThemesAccessError(text) {
  return /access denied|not approved|required access|read_themes/i.test(
    text || "",
  );
}

export function themesLoadErrorMessage(errors) {
  const text = Array.isArray(errors)
    ? themesErrorText({
        message: errors.map((error) => error?.message || "").join(" "),
      })
    : themesErrorText(errors);

  if (!text || /occurred while fetching from the API/i.test(text)) {
    return "Theme embed status could not be loaded.";
  }
  if (isThemesAccessError(text)) {
    return "Theme embed status could not be loaded. Approve read_themes for this app, then reload.";
  }
  return `Theme embed status could not be loaded. ${text.slice(0, 180)}`;
}

function inactiveEmbeds(embeds) {
  return (embeds || []).map((embed) => ({ ...embed, active: false }));
}

export async function loadEceAppEmbeds(admin, embeds) {
  try {
    const response = await admin.graphql(ECE_THEME_SETTINGS_QUERY);
    const payload = await response.json();
    if (payload?.errors?.length) {
      const text = themesErrorText({
        message: payload.errors.map((error) => error?.message || "").join(" "),
      });
      console.error("ece theme embed query failed", text);
      return {
        embeds: inactiveEmbeds(embeds),
        embedsError: themesLoadErrorMessage(payload.errors),
        themesAccessDenied: isThemesAccessError(text),
      };
    }

    const content =
      payload?.data?.themes?.nodes?.[0]?.files?.nodes?.[0]?.body?.content;
    if (typeof content !== "string" || !content.trim()) {
      return {
        embeds: inactiveEmbeds(embeds),
        embedsError: "The published theme settings could not be read.",
        themesAccessDenied: false,
      };
    }

    const parsed = parseThemeSettings(content);
    if (!parsed.ok) {
      return {
        embeds: inactiveEmbeds(embeds),
        embedsError: null,
        themesAccessDenied: false,
      };
    }

    return {
      embeds: embedsWithThemeStatus(embeds, content),
      embedsError: null,
      themesAccessDenied: false,
    };
  } catch (error) {
    const text = themesErrorText(error);
    console.error("ece theme embed query failed", text);
    return {
      embeds: inactiveEmbeds(embeds),
      embedsError: themesLoadErrorMessage([{ message: text }]),
      themesAccessDenied: isThemesAccessError(text),
    };
  }
}
