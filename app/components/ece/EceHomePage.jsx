/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { useFetcher, useNavigate, useRevalidator } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { EceActivateRedirection } from "./EceActivateRedirection";
import { EceDashboardOverview } from "./EceDashboardOverview";
import { EceAddRuleModal } from "./EceRuleModals";
import { EcePopupTemplatesModal, useEcePopupTemplates } from "./EcePopupTemplates";
import { EceWelcomePanel } from "./EceWelcomePanel";
import {
  catalogGroups,
  destinationUrlError,
  ruleNameError,
  takenCountryKeys,
} from "./eceRuleModel";

const RULE_ACTION = "/app/redirect";

function emptyDraft() {
  return {
    id: "",
    name: "",
    url: "",
    countries: [],
    popupTemplateId: "",
    nameError: "",
    urlError: "",
    countryError: "",
    formError: "",
  };
}

export function EceHomePage({
  shop,
  embeds,
  embedsError,
  rules = [],
  rulesError,
  blocker = null,
  countryCatalog,
}) {
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const fetcher = useFetcher();
  const addModalRef = useRef(null);
  const handledResult = useRef(null);
  const [addDraft, setAddDraft] = useState(emptyDraft);
  const [addPickerKey, setAddPickerKey] = useState(0);

  const groups = catalogGroups(countryCatalog);
  const rulesLocked = Boolean(rulesError);
  const saving = fetcher.state !== "idle";
  const templates = useEcePopupTemplates({
    addModalRef,
    setDraft: setAddDraft,
    disabled: saving,
  });

  useEffect(() => {
    function refreshEmbedStatus() {
      if (document.visibilityState !== "visible") return;
      if (revalidator.state !== "idle") return;
      revalidator.revalidate();
    }

    document.addEventListener("visibilitychange", refreshEmbedStatus);
    return () => document.removeEventListener("visibilitychange", refreshEmbedStatus);
  }, [revalidator]);

  useEffect(() => {
    if (addPickerKey === 0) return;
    addModalRef.current?.showOverlay();
  }, [addPickerKey]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (handledResult.current === fetcher.data) return;
    handledResult.current = fetcher.data;
    const result = fetcher.data;

    if (!result.ok) {
      setAddDraft((current) => ({
        ...current,
        nameError: result.nameError || "",
        urlError: result.urlError || "",
        countryError: result.countryError || "",
        formError: result.formError || "The rule could not be saved.",
      }));
      return;
    }

    addModalRef.current?.hideOverlay();
    setAddDraft(emptyDraft());
    shopify.toast.show("Rule added");
    revalidator.revalidate();
  }, [fetcher.data, fetcher.state, revalidator, shopify]);

  function configureEmbed(embed) {
    if (embed.editorUrl) {
      const topWindow = window.top || window;
      topWindow.location.href = embed.editorUrl;
      return;
    }
    shopify.toast.show(
      `${embed.label} will open in the theme editor once that embed is connected.`,
    );
  }

  function openShopifyMarkets() {
    const shopHandle = String(shop || "").replace(/\.myshopify\.com$/i, "");
    if (!shopHandle) {
      shopify.toast.show("Shopify Markets could not be opened for this store.");
      return;
    }
    const topWindow = window.top || window;
    topWindow.location.href = `https://admin.shopify.com/store/${shopHandle}/markets`;
  }

  function openCreateRedirect() {
    if (saving) return;
    if (rulesLocked) {
      shopify.toast.show(rulesError || "Country rules could not be loaded.");
      return;
    }
    setAddDraft(emptyDraft());
    setAddPickerKey((token) => token + 1);
  }

  function submitRule() {
    if (rulesLocked || saving) return;
    const nameError = ruleNameError(addDraft.name);
    const urlError = destinationUrlError(addDraft.url);
    const countryError =
      addDraft.countries.length === 0 ? "Choose at least one country." : "";

    if (nameError || urlError || countryError) {
      setAddDraft((current) => ({
        ...current,
        nameError,
        urlError,
        countryError,
        formError: "",
      }));
      return;
    }

    const formData = new FormData();
    formData.set("intent", "create-rule");
    formData.set("ruleId", "");
    formData.set("name", addDraft.name.trim());
    formData.set("url", addDraft.url || "");
    formData.set(
      "countryCodes",
      JSON.stringify(addDraft.countries.map((country) => country.code)),
    );
    fetcher.submit(formData, { method: "POST", action: RULE_ACTION });
  }

  return (
    <s-page id="ece-home" heading="Dashboard" inlineSize="large">
      <EceWelcomePanel
        shop={shop}
        rules={rules}
        blocker={blocker}
        embeds={embeds}
        onCreateRedirect={openCreateRedirect}
        onViewRedirects={() => navigate(RULE_ACTION)}
        onCreateBlock={() => navigate("/app/blocker")}
        onViewBlocks={() => navigate("/app/blocker")}
        onSetupMarkets={openShopifyMarkets}
        onViewMarkets={() => navigate(RULE_ACTION)}
        onConfigureEmbed={configureEmbed}
      />

      <EceDashboardOverview
        rules={rules}
        rulesError={rulesError}
        embeds={embeds}
        onCreateRedirect={openCreateRedirect}
        onViewRedirects={() => navigate(RULE_ACTION)}
        onOpenPopup={() => navigate("/app/popup")}
        onOpenBlocker={() => navigate("/app/blocker")}
        activation={
          <EceActivateRedirection
            embeds={embeds}
            embedsError={embedsError}
            onConfigure={configureEmbed}
          />
        }
      />

      <EceAddRuleModal
        modalRef={addModalRef}
        draft={addDraft}
        setDraft={setAddDraft}
        groups={groups}
        taken={takenCountryKeys(rules)}
        pickerKey={addPickerKey}
        saving={saving}
        onSave={submitRule}
        onBrowseTemplates={templates.openTemplates}
      />
      <EcePopupTemplatesModal
        {...templates.modalProps}
        selectedId={addDraft.popupTemplateId}
      />
    </s-page>
  );
}
