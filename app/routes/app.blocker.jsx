/* global process */
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import eceHomeRules from "../data/eceHomeRules.json";
import { EceCountryBlockerPage } from "../components/ece/EceCountryBlockerPage";
import { loadEceAppEmbeds } from "../utils/eceAppEmbeds.server";
import {
  loadEceCountryBlocker,
  saveEceCountryBlocker,
} from "../utils/eceCountryBlocker.server";

const BLOCKER_EMBED = {
  id: "ece-embed-blocker",
  label: "Country Blocker",
  detail: "Shows the full-page block saved on this page.",
};

async function requestThemeScope(scopes, session) {
  const granted = new Set(
    String(session?.scope || "")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean),
  );
  if (granted.has("read_themes")) return;
  try {
    await scopes.request(["read_themes"]);
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error(
      "ece scope request failed",
      "read_themes",
      error?.message || "unknown error",
    );
  }
}

export const loader = async ({ request }) => {
  const { admin, session, scopes } = await authenticate.admin(request);
  await requestThemeScope(scopes, session);
  const [loaded, embedResult] = await Promise.all([
    loadEceCountryBlocker(admin),
    loadEceAppEmbeds(admin, [BLOCKER_EMBED]),
  ]);

  const shopHandle = String(session.shop || "").replace(/\.myshopify\.com$/i, "");
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  return {
    blocker: loaded.blocker,
    blockerError: loaded.error || "",
    countryCatalog: eceHomeRules.countryCatalog,
    embedActive: Boolean(embedResult.embeds[0]?.active),
    embedError: embedResult.embedsError || "",
    editorUrl:
      shopHandle && apiKey
        ? `https://admin.shopify.com/store/${shopHandle}/themes/current/editor?context=apps&template=index&activateAppId=${apiKey}/country-blocker`
        : "",
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const raw = formData.get("payload");

  let patch = null;
  if (typeof raw === "string" && raw.trim()) {
    try {
      patch = JSON.parse(raw);
    } catch {
      patch = null;
    }
  }

  if (!patch || typeof patch !== "object") {
    return { ok: false, error: "The country blocker could not be read." };
  }

  const saved = await saveEceCountryBlocker(admin, patch);
  if (!saved.ok) {
    return {
      ok: false,
      error: saved.error || "The country blocker could not be saved.",
    };
  }

  return { ok: true, blocker: saved.blocker };
};

export default function BlockerPage() {
  const data = useLoaderData();
  return <EceCountryBlockerPage {...data} />;
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
