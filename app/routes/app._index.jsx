/* global process */
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import eceHomeRules from "../data/eceHomeRules.json";
import { EceHomePage } from "../components/ece/EceHomePage";
import { withCatalogCountryNames } from "../components/ece/eceRuleModel";
import { loadEceAppEmbeds } from "../utils/eceAppEmbeds.server";
import { loadEceCountryBlocker } from "../utils/eceCountryBlocker.server";
import { loadEceRouteBook } from "../utils/eceRouteBook.server";

const HOME_SCOPES = ["read_themes"];

function grantedScopes(session) {
  return new Set(
    String(session?.scope || "")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean),
  );
}

function missingHomeScopes(session) {
  const granted = grantedScopes(session);
  return HOME_SCOPES.filter((scope) => !granted.has(scope));
}

async function requestHomeScopes(scopes, names) {
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

  await requestHomeScopes(scopes, missingHomeScopes(session));

  const [embedResult, routeBook, blockerResult] = await Promise.all([
    loadEceAppEmbeds(admin, eceHomeRules.embeds),
    loadEceRouteBook(admin),
    loadEceCountryBlocker(admin),
  ]);

  if (embedResult.themesAccessDenied) {
    await requestHomeScopes(scopes, ["read_themes"]);
  }

  const shopHandle = String(session.shop || "").replace(/\.myshopify\.com$/i, "");
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const editorHandles = {
    "ece-embed-popup": "redirect-popup",
    "ece-embed-auto": "auto-redirect",
    "ece-embed-switcher": "floating-selector",
  };

  return {
    shop: session.shop,
    embeds: embedResult.embeds.map((embed) => {
      const handle = editorHandles[embed.id];
      if (!handle || !shopHandle || !apiKey) return embed;
      return {
        ...embed,
        editorUrl: `https://admin.shopify.com/store/${shopHandle}/themes/current/editor?context=apps&template=index&activateAppId=${apiKey}/${handle}`,
      };
    }),
    embedsError: embedResult.embedsError,
    rules: withCatalogCountryNames(
      routeBook.rules,
      eceHomeRules.countryCatalog,
    ),
    rulesError: routeBook.rulesError,
    blocker: blockerResult.blocker,
    countryCatalog: eceHomeRules.countryCatalog,
  };
};

export default function Index() {
  const {
    shop,
    embeds,
    embedsError,
    rules,
    rulesError,
    blocker,
    countryCatalog,
  } = useLoaderData();

  return (
    <EceHomePage
      shop={shop}
      embeds={embeds}
      embedsError={embedsError}
      rules={rules}
      rulesError={rulesError}
      blocker={blocker}
      countryCatalog={countryCatalog}
    />
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
