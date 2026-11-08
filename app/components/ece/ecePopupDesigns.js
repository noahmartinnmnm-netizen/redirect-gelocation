export const ECE_POPUP_WIDTH_MIN = 27;
export const ECE_POPUP_WIDTH_MAX = 60;

export const ECE_COUNTRY_TOKEN = "--country--";
export const ECE_FLAG_TOKEN = "--flag--";

export const ECE_STORE_COUNTRY = "US";

export const ECE_PREVIEW_COUNTRIES = [
  {
    code: "FR",
    name: "France",
    currency: { code: "EUR", symbol: "€" },
    languages: [{ code: "fr", name: "Français" }, { code: "en", name: "English" }],
  },
  {
    code: "DE",
    name: "Germany",
    currency: { code: "EUR", symbol: "€" },
    languages: [{ code: "de", name: "Deutsch" }, { code: "en", name: "English" }],
  },
  {
    code: "GB",
    name: "United Kingdom",
    currency: { code: "GBP", symbol: "£" },
    languages: [{ code: "en", name: "English" }],
  },
  {
    code: "CA",
    name: "Canada",
    currency: { code: "CAD", symbol: "$" },
    languages: [{ code: "en", name: "English" }, { code: "fr", name: "Français" }],
  },
  {
    code: "AU",
    name: "Australia",
    currency: { code: "AUD", symbol: "$" },
    languages: [{ code: "en", name: "English" }],
  },
  {
    code: "JP",
    name: "Japan",
    currency: { code: "JPY", symbol: "¥" },
    languages: [{ code: "ja", name: "日本語" }, { code: "en", name: "English" }],
  },
  {
    code: "IN",
    name: "India",
    currency: { code: "INR", symbol: "₹" },
    languages: [{ code: "en", name: "English" }, { code: "hi", name: "हिन्दी" }],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    currency: { code: "AED", symbol: "د.إ" },
    languages: [{ code: "ar", name: "العربية" }, { code: "en", name: "English" }],
  },
  {
    code: "BR",
    name: "Brazil",
    currency: { code: "BRL", symbol: "R$" },
    languages: [{ code: "pt", name: "Português" }],
  },
  {
    code: "ES",
    name: "Spain",
    currency: { code: "EUR", symbol: "€" },
    languages: [{ code: "es", name: "Español" }, { code: "en", name: "English" }],
  },
  {
    code: "US",
    name: "United States",
    currency: { code: "USD", symbol: "$" },
    languages: [{ code: "en", name: "English" }, { code: "es", name: "Español" }],
  },
];

export const ECE_POPUP_TEMPLATES = [
  {
    id: "ece-confirm-spotlight",
    name: "Spotlight",
    kind: "confirm",
    kindLabel: "Confirm popup",
    summary: "One clear question. The visitor goes to their local store or stays here.",
  },
  {
    id: "ece-selector-passport",
    name: "Passport",
    kind: "selector",
    kindLabel: "Country selector",
    summary: "Visitors pick their country and language, with currency shown next to each country.",
  },
];

const DEFAULT_DESIGNS = {
  "ece-confirm-spotlight": {
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

export const ECE_COLOR_PRESETS = [
  {
    id: "light",
    name: "Light",
    colors: {
      background: "#ffffff",
      headingColor: "#1a1a1a",
      messageColor: "#5c5f62",
      primaryBackground: "#1a1a1a",
      primaryText: "#ffffff",
      secondaryBackground: "#ffffff",
      secondaryText: "#303030",
      dropdownBackground: "#f6f6f7",
      dropdownText: "#1a1a1a",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    colors: {
      background: "#0f172a",
      accent: "#818cf8",
      headingColor: "#f8fafc",
      messageColor: "#cbd5e1",
      primaryBackground: "#818cf8",
      primaryText: "#0f172a",
      secondaryBackground: "#1e293b",
      secondaryText: "#e2e8f0",
      dropdownBackground: "#1e293b",
      dropdownText: "#f8fafc",
    },
  },
  {
    id: "sand",
    name: "Sand",
    colors: {
      background: "#fbf7f0",
      accent: "#b45309",
      headingColor: "#3b2f20",
      messageColor: "#6b5a45",
      primaryBackground: "#b45309",
      primaryText: "#ffffff",
      secondaryBackground: "#fbf7f0",
      secondaryText: "#7c4a12",
      dropdownBackground: "#f3ebdd",
      dropdownText: "#3b2f20",
    },
  },
  {
    id: "forest",
    name: "Forest",
    colors: {
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
  },
];

export const ECE_POPUP_DESIGN_KEY = "pd_desgine";
export const ECE_POPUP_DESIGN_VERSION = 1;

const CONTENT_LIMITS = {
  heading: ["Heading", 300],
  message: ["Message", 2000],
  primaryButton: ["Primary button", 200],
  secondaryButton: ["Secondary button", 200],
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

export function defaultPopupDesign(templateId) {
  const base = DEFAULT_DESIGNS[templateId] || DEFAULT_DESIGNS["ece-confirm-spotlight"];
  return {
    templateId,
    content: { ...base.content },
    style: { ...base.style },
    preferences: { ...base.preferences },
  };
}

function popupTemplate(templateId) {
  return ECE_POPUP_TEMPLATES.find((template) => template.id === templateId) || null;
}

function readText(value, limit) {
  const text = String(value ?? "").trim();
  if (text.length > limit) return null;
  return text;
}

function readBool(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

function readInt(value, min, max, fallback) {
  if (value == null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function readColor(value, fallback) {
  let hex = String(value ?? "").trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  return fallback;
}

function readImageUrl(value) {
  let url = String(value ?? "").trim();
  if (!url) return { ok: true, value: "" };
  if (url.startsWith("//")) url = `https:${url}`;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { ok: false, error: "Image URL must start with http:// or https://." };
  }
  if (url.length > 2048) {
    return { ok: false, error: "Image URL must be 2048 characters or fewer." };
  }
  return { ok: true, value: url };
}

/**
 * Editor shape: templateId, content, style, preferences.
 * Missing fields are filled from that template's defaults so the saved
 * document always contains every value the storefront embed renders.
 * Booleans stay real JSON booleans. Liquid treats a non-empty string as
 * true, so the string "false" would show a control that should be hidden.
 */
export function normalizePopupDesign(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "The popup design could not be read." };
  }

  const template = popupTemplate(input.templateId);
  if (!template) {
    return { ok: false, error: "Choose a popup design before saving." };
  }

  const defaults = defaultPopupDesign(template.id);
  const content = {};
  for (const [key, [label, limit]] of Object.entries(CONTENT_LIMITS)) {
    const source = input.content?.[key] ?? defaults.content[key];
    const text = readText(source, limit);
    if (text == null) {
      return { ok: false, error: `${label} must be ${limit} characters or fewer.` };
    }
    content[key] = text;
  }

  const styleInput = input.style || {};
  let width = defaults.style.width;
  if (styleInput.width != null && styleInput.width !== "") {
    const numeric = Number(styleInput.width);
    width = Number.isFinite(numeric)
      ? Math.round(popupWidthRem(numeric))
      : defaults.style.width;
  }
  const style = {
    width,
    radius: readInt(styleInput.radius, 0, 32, defaults.style.radius),
    headingSize: readInt(styleInput.headingSize, 16, 36, defaults.style.headingSize),
    backdrop: readInt(styleInput.backdrop, 0, 80, defaults.style.backdrop),
    glass: readBool(styleInput.glass, defaults.style.glass),
  };
  for (const key of COLOR_KEYS) {
    style[key] = readColor(styleInput[key], defaults.style[key]);
  }

  const preferenceInput = input.preferences || {};
  const preferences = {};
  for (const key of BOOLEAN_KEYS) {
    preferences[key] = readBool(preferenceInput[key], defaults.preferences[key]);
  }
  preferences.cookieMinutes = readInt(
    preferenceInput.cookieMinutes,
    1,
    10080,
    defaults.preferences.cookieMinutes,
  );
  const image = readImageUrl(preferenceInput.headerImageUrl);
  if (!image.ok) return image;
  preferences.headerImageUrl = image.value;

  return {
    ok: true,
    design: { templateId: template.id, content, style, preferences },
  };
}

/**
 * Shop metafield ece.pd_desgine. Liquid: shop.metafields.ece.pd_desgine.value
 * One live design, not the full template list. updatedAt is set by the server.
 */
export function popupDesignDocument(design, updatedAt) {
  const normalized = normalizePopupDesign(design);
  if (!normalized.ok) return null;
  const template = popupTemplate(normalized.design.templateId);
  return {
    version: ECE_POPUP_DESIGN_VERSION,
    updatedAt,
    templateId: template.id,
    kind: template.kind,
    name: template.name,
    tokens: {
      country: ECE_COUNTRY_TOKEN,
      flag: ECE_FLAG_TOKEN,
    },
    content: normalized.design.content,
    style: normalized.design.style,
    preferences: normalized.design.preferences,
  };
}

export function popupDesignFingerprint(design) {
  const document = popupDesignDocument(design, "");
  if (!document) return "";
  return JSON.stringify({ ...document, updatedAt: undefined });
}

export function parseStoredPopupDesign(raw) {
  if (raw == null || String(raw).trim() === "") {
    return { ok: true, design: null };
  }

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        design: null,
        error: "The saved popup design could not be read. Save again to replace it.",
      };
    }
  }

  const normalized = normalizePopupDesign(parsed);
  if (!normalized.ok) {
    return {
      ok: false,
      design: null,
      error: normalized.error || "The saved popup design could not be read. Save again to replace it.",
    };
  }
  return { ok: true, design: normalized.design };
}

export function defaultPopupDesigns() {
  return Object.fromEntries(
    ECE_POPUP_TEMPLATES.map((template) => [template.id, defaultPopupDesign(template.id)]),
  );
}

export function popupWidthRem(value) {
  const width = Number(value);
  if (!Number.isFinite(width)) return ECE_POPUP_WIDTH_MIN;
  const rem = width > 100 ? width / 10 : width;
  return Math.min(ECE_POPUP_WIDTH_MAX, Math.max(ECE_POPUP_WIDTH_MIN, rem));
}

export function previewCountry(code) {
  return (
    ECE_PREVIEW_COUNTRIES.find((country) => country.code === code) ||
    ECE_PREVIEW_COUNTRIES[0]
  );
}

const TOKEN_PATTERN = /(--flag--\s*--country--|--country--\s*--flag--|--flag--|--country--)/g;

export function tokenParts(text) {
  return String(text || "")
    .split(TOKEN_PATTERN)
    .filter((part) => part !== "")
    .map((part) => {
      if (part === ECE_FLAG_TOKEN) return { type: "flag" };
      if (part === ECE_COUNTRY_TOKEN) return { type: "country" };
      if (part.includes(ECE_FLAG_TOKEN) && part.includes(ECE_COUNTRY_TOKEN)) {
        return { type: "flagCountry" };
      }
      return { type: "text", value: part };
    });
}

export function buttonLabel(text, countryName, uppercase) {
  const name = uppercase ? countryName.toUpperCase() : countryName;
  return String(text || "")
    .split(ECE_FLAG_TOKEN)
    .join("")
    .split(ECE_COUNTRY_TOKEN)
    .join(name)
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function currencyLabel(currency, preferences) {
  const parts = [];
  if (preferences.showCurrencyCode) parts.push(currency.code);
  if (preferences.showCurrencySymbol) parts.push(currency.symbol);
  return parts.join(" ");
}

export function hexToRgba(hex, alpha) {
  let value = String(hex || "").replace("#", "").trim();
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (!/^[0-9a-f]{6}/i.test(value)) return `rgba(255, 255, 255, ${alpha})`;
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function flagImageUrl(code) {
  return `https://flagcdn.com/w80/${String(code || "").toLowerCase()}.png`;
}
