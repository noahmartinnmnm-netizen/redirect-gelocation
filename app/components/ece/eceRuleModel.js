export const ECE_URL_PREVIEW_LENGTH = 40;
export const ECE_COUNTRY_PREVIEW_COUNT = 5;

export const ECE_METAFIELD_NAMESPACE = "ece";
export const ECE_RULE_COUNTRY_KEY = "rule_country";
export const ECE_MARKETS_ROUTING_KEY = "markets_routing";

export function isMarketsRoutingOn(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return true;
  if (text === "off" || text === "0" || text === "false") return false;
  return !/pinstamarket["']?\s*:\s*0/.test(text);
}

const RULE_NAME_LIMIT = 120;
const RULE_URL_LIMIT = 2048;

export function createEceRuleId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ece-rule-${crypto.randomUUID()}`;
  }
  return `ece-rule-${Date.now()}`;
}

export function ruleNameError(name) {
  const value = String(name ?? "").trim();
  if (!value) return "Enter a rule name.";
  if (value.length > RULE_NAME_LIMIT) {
    return `Name must be ${RULE_NAME_LIMIT} characters or fewer.`;
  }
  return "";
}

export function destinationUrlError(url) {
  const value = String(url ?? "").trim();
  if (!value) return "Enter a destination URL.";
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return "URL must start with http:// or https://.";
  }
  return "";
}

export function serverDestinationUrlError(url) {
  const prefixError = destinationUrlError(url);
  if (prefixError) return prefixError;
  if (String(url ?? "").trim().length > RULE_URL_LIMIT) {
    return "Enter a shorter destination URL.";
  }
  try {
    const parsed = new URL(String(url).trim());
    if (!parsed.hostname) return "Enter a destination URL with a host.";
  } catch {
    return "Enter a destination URL with a host.";
  }
  return "";
}

export function destinationHost(url) {
  const value = String(url ?? "").trim();
  if (!/^https?:\/\//.test(value)) return "";
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

export function displayRuleName(name) {
  const value = String(name ?? "").trim();
  return value || "Untitled";
}

export function takenCountryKeys(rules, exceptRuleId) {
  const codes = new Set();
  const names = new Set();
  for (const rule of rules) {
    if (exceptRuleId && rule.id === exceptRuleId) continue;
    for (const country of rule.countries ?? []) {
      codes.add(country.code);
      names.add(country.name);
    }
  }
  return { codes, names };
}

export function isCountryTaken(country, taken) {
  return taken.codes.has(country.code) || taken.names.has(country.name);
}

export function shouldShowMarketsCard(markets) {
  if (!Array.isArray(markets) || markets.length === 0) return false;
  if (markets.length > 1) return true;
  if (markets[0].includesAllRegions) return true;
  return (markets[0].countries?.length ?? 0) > 1;
}

export function isMarketActive(status) {
  return status === "ACTIVE";
}

export function catalogGroups(countryCatalog) {
  return Object.entries(countryCatalog ?? {}).map(([continent, countries]) => ({
    continent,
    countries: [...countries].sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
  }));
}

export function indexCountryCatalog(countryCatalog) {
  const byCode = new Map();
  for (const countries of Object.values(countryCatalog ?? {})) {
    for (const country of countries ?? []) {
      const code = String(country?.code || "")
        .trim()
        .toUpperCase();
      const name = String(country?.name || "").trim();
      if (!/^[A-Z]{2}$/.test(code) || !name) continue;
      byCode.set(code, { code, name });
    }
  }
  return byCode;
}

export function ruleCountryDocument(rules) {
  return (rules ?? []).map((rule) => ({
    name: rule.name || "",
    country_code: (rule.countries ?? []).map((country) => country.code),
    url: rule.url,
  }));
}

export function withCatalogCountryNames(rules, countryCatalog) {
  const catalog = indexCountryCatalog(countryCatalog);
  return (rules ?? []).map((rule) => ({
    ...rule,
    countries: (rule.countries ?? []).map((country) => ({
      code: country.code,
      name: catalog.get(country.code)?.name || country.name || country.code,
    })),
  }));
}

export function duplicateCountryNames(rules) {
  const owner = new Map();
  const names = new Set();
  for (const rule of rules ?? []) {
    for (const country of rule.countries ?? []) {
      if (owner.has(country.code)) names.add(country.name);
      else owner.set(country.code, rule.id);
    }
  }
  return [...names];
}

export function parseStoredRouteBook(value) {
  if (value == null || value === "") return { ok: true, rules: [] };

  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return unreadableRouteBook();
    }
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    Array.isArray(parsed.rules)
  ) {
    parsed = parsed.rules;
  }

  if (!Array.isArray(parsed)) return unreadableRouteBook();

  const rules = [];
  const ids = new Set();
  for (const [index, entry] of parsed.entries()) {
    const rule = normalizeStoredRule(entry, index);
    if (!rule || ids.has(rule.id)) return unreadableRouteBook();
    ids.add(rule.id);
    rules.push(rule);
  }

  return { ok: true, rules };
}

export function nextRouteBook(rules, input, countryCatalog) {
  const intent = input?.intent;
  const current = Array.isArray(rules) ? rules : [];

  if (intent === "delete-rule") {
    const ruleId = String(input.ruleId || "").trim();
    if (!current.some((rule) => rule.id === ruleId)) {
      return routeBookFailure({
        formError: "This rule is no longer on the shop. Reload the page.",
      });
    }
    return {
      ok: true,
      rules: current.filter((rule) => rule.id !== ruleId),
    };
  }

  if (intent !== "create-rule" && intent !== "update-rule") {
    return routeBookFailure({ formError: "That action is not available." });
  }

  const name = String(input.name || "").trim();
  const nameError = ruleNameError(name);
  if (nameError) return routeBookFailure({ nameError });

  const urlError = serverDestinationUrlError(input.url);
  if (urlError) return routeBookFailure({ urlError });

  const exceptId =
    intent === "update-rule" ? String(input.ruleId || "").trim() : "";
  const existing =
    intent === "update-rule"
      ? current.find((rule) => rule.id === exceptId)
      : null;
  if (intent === "update-rule" && !existing) {
    return routeBookFailure({
      formError: "This rule is no longer on the shop. Reload the page.",
    });
  }

  const resolved = resolveCountryCodes(
    input.countryCodes,
    indexCountryCatalog(countryCatalog),
    existing?.countries,
  );
  if (resolved.error) return routeBookFailure({ countryError: resolved.error });
  if (intent === "create-rule" && resolved.countries.length === 0) {
    return routeBookFailure({
      countryError: "Choose at least one country.",
    });
  }

  const overlap = countryNamesUsedElsewhere(
    current,
    resolved.countries,
    exceptId,
  );
  if (overlap.length > 0) {
    const verb = overlap.length === 1 ? "is" : "are";
    return routeBookFailure({
      countryError: `${overlap.join(" · ")} ${verb} already on another rule.`,
    });
  }

  const nextRule = {
    id: intent === "update-rule" ? exceptId : createEceRuleId(),
    name,
    url: String(input.url).trim(),
    countries: resolved.countries,
  };
  const nextRules =
    intent === "update-rule"
      ? current.map((rule) => (rule.id === nextRule.id ? nextRule : rule))
      : [...current, nextRule];

  return { ok: true, rules: nextRules };
}

function unreadableRouteBook() {
  return {
    ok: false,
    rules: [],
    error: "Saved rules could not be read. Nothing was changed.",
  };
}

function routeBookFailure(errors) {
  return {
    ok: false,
    errors: {
      formError: errors.formError || "",
      nameError: errors.nameError || "",
      urlError: errors.urlError || "",
      countryError: errors.countryError || "",
    },
  };
}

function normalizeStoredRule(entry, index) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const url = String(entry.url || "").trim();
  const codes = countryCodesFromEntry(entry);
  if (!url || !codes) return null;

  const countries = [];
  const seen = new Set();
  for (const country of codes) {
    const code = String(country?.code || country || "")
      .trim()
      .toUpperCase();
    const name = String(country?.name || "").trim();
    if (!/^[A-Z]{2}$/.test(code)) return null;
    if (seen.has(code)) continue;
    seen.add(code);
    countries.push({ code, name: name || code });
  }

  const id = String(entry.id || "").trim() || `ece-rule-${index}`;
  return {
    id,
    name: String(entry.name || "").trim(),
    url,
    countries,
  };
}

function countryCodesFromEntry(entry) {
  if (Array.isArray(entry.country_code)) return entry.country_code;
  if (typeof entry.country_code === "string") {
    return entry.country_code
      .split(/[\s,]+/)
      .map((code) => code.trim())
      .filter(Boolean);
  }
  if (Array.isArray(entry.countries)) return entry.countries;
  return null;
}

function resolveCountryCodes(countryCodes, catalog, retained = []) {
  if (!Array.isArray(countryCodes)) {
    return { error: "Choose countries from the list.", countries: [] };
  }

  const retainedByCode = new Map(
    retained.map((country) => [country.code, country]),
  );
  const countries = [];
  const seen = new Set();

  for (const raw of countryCodes) {
    const code = String(raw || "")
      .trim()
      .toUpperCase();
    if (!code || seen.has(code)) continue;
    const known = catalog.get(code) || retainedByCode.get(code);
    if (!known) {
      return { error: "Choose countries from the list.", countries: [] };
    }
    seen.add(code);
    countries.push({ code: known.code, name: known.name });
  }

  return { error: "", countries };
}

function countryNamesUsedElsewhere(rules, countries, exceptRuleId) {
  const used = new Map();
  for (const rule of rules) {
    if (exceptRuleId && rule.id === exceptRuleId) continue;
    for (const country of rule.countries ?? []) {
      used.set(country.code, country.name);
    }
  }
  return countries
    .filter((country) => used.has(country.code))
    .map((country) => used.get(country.code));
}

export function visibleCatalogCountries(group, query, taken) {
  const available = group.countries.filter(
    (country) => !isCountryTaken(country, taken),
  );
  if (!query) return available;
  if (group.continent.toLowerCase().includes(query)) return available;
  return available.filter((country) =>
    country.name.toLowerCase().includes(query),
  );
}
