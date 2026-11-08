import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import eceHomeRules from "../data/eceHomeRules.json";
import { EceRedirectPage } from "../components/ece/EceRedirectPage";
import {
  nextRouteBook,
  withCatalogCountryNames,
} from "../components/ece/eceRuleModel";
import { loadEceShopMarkets } from "../utils/eceShopMarkets.server";
import {
  loadEceRouteBook,
  writeEceMarketsRouting,
  writeEceRouteBook,
} from "../utils/eceRouteBook.server";

const REDIRECT_SCOPES = ["read_markets"];

function grantedScopes(session) {
  return new Set(
    String(session?.scope || "")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean),
  );
}

function missingRedirectScopes(session) {
  const granted = grantedScopes(session);
  return REDIRECT_SCOPES.filter((scope) => !granted.has(scope));
}

async function requestRedirectScopes(scopes, names) {
  if (!names.length) return;
  try {
    await scopes.request(names);
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error(
      "ece scope request failed",
      names.join(","),
      error?.message || "unknown error",
    );
  }
}

export const loader = async ({ request }) => {
  const { admin, session, scopes } = await authenticate.admin(request);

  await requestRedirectScopes(scopes, missingRedirectScopes(session));

  const [marketResult, loadedBook] = await Promise.all([
    loadEceShopMarkets(admin),
    loadEceRouteBook(admin),
  ]);
  const routeBook = await publishMissingMarketsRouting(admin, loadedBook);

  if (marketResult.marketsAccessDenied) {
    await requestRedirectScopes(scopes, ["read_markets"]);
  }

  return {
    shop: session.shop,
    markets: marketResult.markets,
    marketsError: marketResult.marketsError,
    marketsRoutingOn: routeBook.marketsRoutingOn,
    rules: withCatalogCountryNames(
      routeBook.rules,
      eceHomeRules.countryCatalog,
    ),
    rulesError: routeBook.rulesError,
    countryCatalog: eceHomeRules.countryCatalog,
  };
};

async function publishMissingMarketsRouting(admin, routeBook) {
  if (!routeBook.shopId || !routeBook.marketsRoutingMissing) return routeBook;
  const saved = await writeEceMarketsRouting(admin, routeBook.shopId, true);
  if (!saved.ok) return routeBook;
  return { ...routeBook, marketsRoutingOn: true, marketsRoutingMissing: false };
}

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const input = readRuleInput(formData);

  if (input.intent === "set-markets-routing") {
    const loaded = await loadEceRouteBook(admin);
    if (!loaded.shopId) {
      return {
        ok: false,
        intent: input.intent,
        formError: "Shopify Markets routing could not be saved.",
      };
    }
    const enabled = input.enabled === "on";
    const saved = await writeEceMarketsRouting(admin, loaded.shopId, enabled);
    if (!saved.ok) {
      return {
        ok: false,
        intent: input.intent,
        formError: saved.error || "Shopify Markets routing could not be saved.",
      };
    }
    return { ok: true, intent: input.intent, marketsRoutingOn: enabled };
  }

  const loaded = await loadEceRouteBook(admin);

  if (loaded.rulesError || !loaded.shopId) {
    return {
      ok: false,
      intent: input.intent,
      formError:
        loaded.rulesError || "Country rules could not be loaded from this shop.",
      urlError: "",
      countryError: "",
    };
  }

  const result = nextRouteBook(
    withCatalogCountryNames(loaded.rules, eceHomeRules.countryCatalog),
    input,
    eceHomeRules.countryCatalog,
  );
  if (!result.ok) {
    return { ok: false, intent: input.intent, ...result.errors };
  }

  const saved = await writeEceRouteBook(admin, loaded.shopId, result.rules);
  if (!saved.ok) {
    return {
      ok: false,
      intent: input.intent,
      formError: saved.error || "The shop could not be updated.",
      urlError: "",
      countryError: "",
    };
  }

  return { ok: true, intent: input.intent };
};

function readRuleInput(formData) {
  const rawCodes = formData.get("countryCodes");
  let countryCodes = [];
  if (typeof rawCodes === "string" && rawCodes.trim()) {
    try {
      const parsed = JSON.parse(rawCodes);
      countryCodes = Array.isArray(parsed) ? parsed : null;
    } catch {
      countryCodes = null;
    }
  }

  return {
    intent: String(formData.get("intent") || ""),
    ruleId: String(formData.get("ruleId") || ""),
    name: String(formData.get("name") || ""),
    url: String(formData.get("url") || ""),
    enabled: String(formData.get("enabled") || ""),
    countryCodes,
  };
}

export default function RedirectPage() {
  const {
    shop,
    markets,
    marketsError,
    rules,
    rulesError,
    countryCatalog,
    marketsRoutingOn,
  } = useLoaderData();

  return (
    <EceRedirectPage
      shop={shop}
      rules={rules}
      rulesError={rulesError}
      countryCatalog={countryCatalog}
      markets={markets}
      marketsError={marketsError}
      marketsRoutingOn={marketsRoutingOn}
    />
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
