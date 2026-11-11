export const ECE_COUNTRY_BLOCKER_KEY = "ece_country_blocker";
export const ECE_COUNTRY_BLOCKER_NAME = "ece country blocker";
export const ECE_WHITELISTED_IPS_KEY = "whitelisted_ips";
export const ECE_COUNTRY_BLOCKER_VERSION = 1;

export const ECE_BLOCKER_HEADING_MIN = 16;
export const ECE_BLOCKER_HEADING_MAX = 48;
export const ECE_BLOCKER_WIDTH_MIN = 300;
export const ECE_BLOCKER_WIDTH_MAX = 800;

const LIST_LIMIT = 500;
const HEADING_LIMIT = 300;
const MESSAGE_LIMIT = 2000;

export const ECE_BLOCKER_TEMPLATES = [
  {
    id: "ece-blocker-default",
    name: "Default",
    summary: "A centered card on a dimmed page. Clear, quiet, and familiar.",
  },
  {
    id: "ece-blocker-modern",
    name: "Modern",
    summary: "A wide panel with a strong accent edge and room for a longer message.",
  },
  {
    id: "ece-blocker-futuristic",
    name: "Futuristic",
    summary: "A dark frame with a sharp accent. Built for a strict, technical block.",
  },
];

const DEFAULT_DESIGNS = {
  "ece-blocker-default": {
    content: {
      heading: "This store isn't available in your country",
      message:
        "We're sorry. Orders from your location can't be completed on this store.",
    },
    style: {
      headingSize: 28,
      maxWidth: 480,
      background: "#ffffff",
      overlay: "#111827",
      text: "#303030",
      accent: "#5700d1",
    },
  },
  "ece-blocker-modern": {
    content: {
      heading: "Not available in your region",
      message:
        "This shop doesn't ship to your country. If you think this is a mistake, contact the store.",
    },
    style: {
      headingSize: 32,
      maxWidth: 560,
      background: "#f4f7fb",
      overlay: "#0f172a",
      text: "#334155",
      accent: "#0f766e",
    },
  },
  "ece-blocker-futuristic": {
    content: {
      heading: "Access restricted",
      message: "Your country or network is not allowed to view this store.",
    },
    style: {
      headingSize: 30,
      maxWidth: 520,
      background: "#070b14",
      overlay: "#020617",
      text: "#e2e8f0",
      accent: "#22d3ee",
    },
  },
};

const STYLE_KEYS = [
  "headingSize",
  "maxWidth",
  "background",
  "overlay",
  "text",
  "accent",
];

export function blockerTemplate(templateId) {
  return ECE_BLOCKER_TEMPLATES.find((template) => template.id === templateId) || null;
}

export function defaultBlockerDesign(templateId) {
  const template = blockerTemplate(templateId) || ECE_BLOCKER_TEMPLATES[0];
  const base = DEFAULT_DESIGNS[template.id];
  return {
    templateId: template.id,
    content: { ...base.content },
    style: { ...base.style },
  };
}

export function defaultBlockerDesigns() {
  return Object.fromEntries(
    ECE_BLOCKER_TEMPLATES.map((template) => [
      template.id,
      defaultBlockerDesign(template.id),
    ]),
  );
}

export function emptyCountryBlocker() {
  return {
    design: null,
    blockedCountries: [],
    blockedIps: [],
    blockedIpRanges: [],
    whitelistedIps: [],
  };
}

export function canonicalIpv4(value) {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return "";
  const parts = [];
  for (let index = 1; index <= 4; index += 1) {
    const number = Number(match[index]);
    if (!Number.isInteger(number) || number > 255) return "";
    parts.push(String(number));
  }
  return parts.join(".");
}

export function ipv4ToLong(value) {
  const canonical = canonicalIpv4(value);
  if (!canonical) return null;
  return canonical.split(".").reduce((total, part) => total * 256 + Number(part), 0);
}

export function canonicalIpv6(value) {
  const text = String(value ?? "")
    .trim()
    .replace(/^\[|\]$/g, "");
  if (!text.includes(":") || text.length > 45) return "";
  try {
    const hostname = new URL(`http://[${text}]/`).hostname;
    if (!hostname.startsWith("[") || !hostname.endsWith("]")) return "";
    return hostname.slice(1, -1).toLowerCase();
  } catch {
    return "";
  }
}

export function ipv4Error(value) {
  if (!String(value ?? "").trim()) return "Enter an IP address.";
  if (!canonicalIpv4(value)) {
    return "Enter an IPv4 address like 203.0.113.10. Each number must be from 0 to 255.";
  }
  return "";
}

export function rangeEntryError(value) {
  const text = String(value ?? "")
    .trim()
    .replace(/\s+/g, "");
  if (!text) return "Enter an IP range.";
  if (text.includes("/")) return cidrError(text);
  return dashError(text);
}

export function normalizeBlockerDesign(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "The country blocker design could not be read." };
  }
  const template = blockerTemplate(input.templateId);
  if (!template) {
    return { ok: false, error: "Choose a country blocker design before saving." };
  }
  const defaults = defaultBlockerDesign(template.id);
  const heading = readText(input.content?.heading ?? defaults.content.heading, HEADING_LIMIT);
  if (heading == null) {
    return { ok: false, error: `Heading must be ${HEADING_LIMIT} characters or fewer.` };
  }
  const message = readText(input.content?.message ?? defaults.content.message, MESSAGE_LIMIT);
  if (message == null) {
    return { ok: false, error: `Message must be ${MESSAGE_LIMIT} characters or fewer.` };
  }
  const styleInput = input.style || {};
  const style = {
    headingSize: readInt(
      styleInput.headingSize,
      ECE_BLOCKER_HEADING_MIN,
      ECE_BLOCKER_HEADING_MAX,
      defaults.style.headingSize,
    ),
    maxWidth: readInt(
      styleInput.maxWidth,
      ECE_BLOCKER_WIDTH_MIN,
      ECE_BLOCKER_WIDTH_MAX,
      defaults.style.maxWidth,
    ),
    background: readColor(styleInput.background, defaults.style.background),
    overlay: readColor(styleInput.overlay, defaults.style.overlay),
    text: readColor(styleInput.text, defaults.style.text),
    accent: readColor(styleInput.accent, defaults.style.accent),
  };
  return {
    ok: true,
    design: {
      templateId: template.id,
      content: { heading, message },
      style,
    },
  };
}

export function blockerDesignDocument(design) {
  const normalized = normalizeBlockerDesign(design);
  if (!normalized.ok) return null;
  const template = blockerTemplate(normalized.design.templateId);
  const style = {};
  for (const key of STYLE_KEYS) style[key] = normalized.design.style[key];
  return {
    templateId: template.id,
    name: template.name,
    content: {
      heading: normalized.design.content.heading,
      message: normalized.design.content.message,
    },
    style,
  };
}

export function blockerDesignFingerprint(design) {
  const document = blockerDesignDocument(design);
  return document ? JSON.stringify(document) : "";
}

export function normalizeCountryCodes(values) {
  if (!Array.isArray(values)) {
    return { ok: false, error: "The country list could not be read." };
  }
  if (values.length > LIST_LIMIT) {
    return { ok: false, error: `Save ${LIST_LIMIT} countries or fewer.` };
  }
  const seen = new Set();
  const list = [];
  for (const value of values) {
    const code = String(value ?? "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      return { ok: false, error: "Choose countries from the list." };
    }
    if (seen.has(code)) continue;
    seen.add(code);
    list.push(code);
  }
  return { ok: true, list };
}

export function normalizeIpv4List(values) {
  return normalizeAddressList(values, false, "IP address");
}

export function normalizeWhitelist(values) {
  return normalizeAddressList(values, true, "IP address");
}

export function normalizeRangeList(values) {
  if (!Array.isArray(values)) {
    return { ok: false, error: "The IP range list could not be read." };
  }
  if (values.length > LIST_LIMIT) {
    return { ok: false, error: `Save ${LIST_LIMIT} IP ranges or fewer.` };
  }
  const seen = new Set();
  const list = [];
  for (const value of values) {
    const error = rangeEntryError(value);
    if (error) return { ok: false, error };
    const canonical = canonicalRange(value);
    if (seen.has(canonical)) {
      return { ok: false, error: `${canonical} is already in the list.` };
    }
    seen.add(canonical);
    list.push(canonical);
  }
  return { ok: true, list };
}

export function normalizeCountryBlocker(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  let design = null;
  if (source.design != null) {
    const normalized = normalizeBlockerDesign(source.design);
    if (!normalized.ok) return normalized;
    design = normalized.design;
  }
  const countries = normalizeCountryCodes(source.blockedCountries || []);
  if (!countries.ok) return countries;
  const ips = normalizeIpv4List(source.blockedIps || []);
  if (!ips.ok) return ips;
  const ranges = normalizeRangeList(source.blockedIpRanges || []);
  if (!ranges.ok) return ranges;
  const whitelist = normalizeWhitelist(source.whitelistedIps || []);
  if (!whitelist.ok) return whitelist;
  return {
    ok: true,
    blocker: {
      design,
      blockedCountries: countries.list,
      blockedIps: ips.list,
      blockedIpRanges: ranges.list,
      whitelistedIps: whitelist.list,
    },
  };
}

export function applyBlockerPatch(current, patch) {
  const base = normalizeCountryBlocker(current || emptyCountryBlocker());
  if (!base.ok) return base;
  const intent = String(patch?.intent || "");
  if (intent === "design") {
    const design = normalizeBlockerDesign(patch.design);
    if (!design.ok) return design;
    return { ok: true, blocker: { ...base.blocker, design: design.design } };
  }
  if (intent === "countries") {
    const countries = normalizeCountryCodes(patch.countries);
    if (!countries.ok) return countries;
    return { ok: true, blocker: { ...base.blocker, blockedCountries: countries.list } };
  }
  if (intent === "ips") {
    const ips = normalizeIpv4List(patch.ips);
    if (!ips.ok) return ips;
    return { ok: true, blocker: { ...base.blocker, blockedIps: ips.list } };
  }
  if (intent === "ranges") {
    const ranges = normalizeRangeList(patch.ranges);
    if (!ranges.ok) return ranges;
    return { ok: true, blocker: { ...base.blocker, blockedIpRanges: ranges.list } };
  }
  if (intent === "whitelist") {
    const whitelist = normalizeWhitelist(patch.whitelist);
    if (!whitelist.ok) return whitelist;
    return { ok: true, blocker: { ...base.blocker, whitelistedIps: whitelist.list } };
  }
  return { ok: false, error: "The country blocker could not be saved." };
}

/**
 * Shop metafield ece.ece_country_blocker.
 * Liquid: shop.metafields.ece.ece_country_blocker.value
 * The key and the Shopify definition name both start with the ece alias.
 * whitelistedIps is also published to ece.whitelisted_ips so the other embeds
 * share one allow-list.
 */
export function countryBlockerDocument(blocker, updatedAt) {
  const normalized = normalizeCountryBlocker(blocker);
  if (!normalized.ok) return null;
  const { design, blockedCountries, blockedIps, blockedIpRanges, whitelistedIps } =
    normalized.blocker;
  return {
    version: ECE_COUNTRY_BLOCKER_VERSION,
    updatedAt,
    design: design ? blockerDesignDocument(design) : null,
    blockedCountries,
    blockedIps,
    blockedIpRanges,
    whitelistedIps,
  };
}

export function parseStoredCountryBlocker(raw) {
  if (raw == null || String(raw).trim() === "") {
    return { ok: true, blocker: null };
  }
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        blocker: null,
        error: "The saved country blocker could not be read. Save again to replace it.",
      };
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      blocker: null,
      error: "The saved country blocker could not be read. Save again to replace it.",
    };
  }
  const storedDesign = parsed.design ?? null;
  const readableDesign =
    storedDesign && normalizeBlockerDesign(storedDesign).ok ? storedDesign : null;
  const normalized = normalizeCountryBlocker({
    design: readableDesign,
    blockedCountries: cleanCountryCodes(parsed.blockedCountries),
    blockedIps: cleanIpv4List(parsed.blockedIps),
    blockedIpRanges: cleanRangeList(parsed.blockedIpRanges),
    whitelistedIps: cleanWhitelist(parsed.whitelistedIps),
  });
  if (!normalized.ok) {
    return {
      ok: false,
      blocker: null,
      error:
        normalized.error ||
        "The saved country blocker could not be read. Save again to replace it.",
    };
  }
  return { ok: true, blocker: normalized.blocker };
}

export function parseStoredWhitelist(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;
  const cleaned = cleanWhitelist(parsed);
  const normalized = normalizeWhitelist(cleaned);
  return normalized.ok ? normalized.list : null;
}

function cleanCountryCodes(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code));
}

function cleanIpv4List(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => canonicalIpv4(value)).filter(Boolean);
}

function cleanRangeList(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => canonicalRange(value)).filter(Boolean);
}

function cleanWhitelist(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => canonicalIpv4(value) || canonicalIpv6(value))
    .filter(Boolean);
}

function normalizeAddressList(values, allowIpv6, label) {
  if (!Array.isArray(values)) {
    return { ok: false, error: `The ${label} list could not be read.` };
  }
  if (values.length > LIST_LIMIT) {
    return { ok: false, error: `Save ${LIST_LIMIT} ${label}es or fewer.` };
  }
  const seen = new Set();
  const list = [];
  for (const value of values) {
    const canonical = canonicalIpv4(value) || (allowIpv6 ? canonicalIpv6(value) : "");
    if (!canonical) {
      const shown = String(value ?? "").trim().slice(0, 45) || "That value";
      return {
        ok: false,
        error: allowIpv6
          ? `${shown} is not a valid IP address.`
          : `${shown} is not an IPv4 address. Each number must be from 0 to 255.`,
      };
    }
    if (seen.has(canonical)) {
      return { ok: false, error: `${canonical} is already in the list.` };
    }
    seen.add(canonical);
    list.push(canonical);
  }
  return { ok: true, list };
}

export function canonicalRange(value) {
  const text = String(value ?? "")
    .trim()
    .replace(/\s+/g, "");
  if (!text || rangeEntryError(text)) return "";
  if (text.includes("/")) {
    const [ip, bits] = text.split("/");
    return `${canonicalIpv4(ip)}/${Number(bits)}`;
  }
  const [start, end] = text.split("-");
  return `${canonicalIpv4(start)}-${canonicalIpv4(end)}`;
}

function cidrError(text) {
  const pieces = text.split("/");
  if (pieces.length !== 2) {
    return "Enter a range like 203.0.113.1-203.0.113.20 or 203.0.113.0/24.";
  }
  if (!canonicalIpv4(pieces[0])) {
    return "Enter a range like 203.0.113.1-203.0.113.20 or 203.0.113.0/24.";
  }
  if (!/^\d{1,2}$/.test(pieces[1])) {
    return "The network mask must be a number from 0 to 32.";
  }
  const mask = Number(pieces[1]);
  if (mask > 32) return "The network mask must be a number from 0 to 32.";
  return "";
}

function dashError(text) {
  const pieces = text.split("-");
  if (pieces.length !== 2 || !canonicalIpv4(pieces[0]) || !canonicalIpv4(pieces[1])) {
    return "Enter a range like 203.0.113.1-203.0.113.20 or 203.0.113.0/24.";
  }
  if (ipv4ToLong(pieces[0]) > ipv4ToLong(pieces[1])) {
    return "The first address in a range must be lower than or equal to the last.";
  }
  return "";
}

function readText(value, limit) {
  const text = String(value ?? "").trim();
  if (text.length > limit) return null;
  return text;
}

function readInt(value, min, max, fallback) {
  if (value == null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function readColor(value, fallback) {
  let hex = String(value ?? "")
    .trim()
    .toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  return fallback;
}
