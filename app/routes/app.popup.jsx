import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { EcePopupPage } from "../components/ece/EcePopupPage";
import {
  loadEcePopupDesign,
  saveEcePopupDesign,
} from "../utils/ecePopupDesign.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const loaded = await loadEcePopupDesign(admin);
  return {
    savedDesign: loaded.design,
    designError: loaded.error || "",
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const raw = formData.get("design");

  let input = null;
  if (typeof raw === "string" && raw.trim()) {
    try {
      input = JSON.parse(raw);
    } catch {
      input = null;
    }
  }

  if (!input) {
    return { ok: false, error: "The popup design could not be read." };
  }

  const saved = await saveEcePopupDesign(admin, input);
  if (!saved.ok) {
    return {
      ok: false,
      error: saved.error || "The popup design could not be saved.",
    };
  }

  return { ok: true, design: saved.design };
};

export default function PopupPage() {
  const { savedDesign, designError } = useLoaderData();
  return <EcePopupPage savedDesign={savedDesign} designError={designError} />;
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
