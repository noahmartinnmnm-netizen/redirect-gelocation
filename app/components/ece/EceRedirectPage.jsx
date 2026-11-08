/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { EceAddRuleModal, EceEditRuleModal } from "./EceRuleModals";
import { EcePopupTemplatesModal, useEcePopupTemplates } from "./EcePopupTemplates";
import {
  ECE_COUNTRY_PREVIEW_COUNT,
  ECE_URL_PREVIEW_LENGTH,
  catalogGroups,
  destinationUrlError,
  displayRuleName,
  duplicateCountryNames,
  isMarketActive,
  ruleNameError,
  shouldShowMarketsCard,
  takenCountryKeys,
} from "./eceRuleModel";
import "./eceHome.css";

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

export function EceRedirectPage({
  shop,
  rules,
  rulesError,
  countryCatalog,
  markets,
  marketsError,
  marketsRoutingOn,
}) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const addModalRef = useRef(null);
  const editModalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const countriesModalRef = useRef(null);
  const pendingIntent = useRef("");
  const handledResult = useRef(null);
  const [marketsOn, setMarketsOn] = useState(marketsRoutingOn !== false);
  const marketsBeforeSave = useRef(marketsRoutingOn !== false);
  const [expandedUrls, setExpandedUrls] = useState({});
  const [countryListRuleId, setCountryListRuleId] = useState("");
  const [countryListToken, setCountryListToken] = useState(0);
  const [addDraft, setAddDraft] = useState(emptyDraft);
  const [editDraft, setEditDraft] = useState(emptyDraft);
  const [addPickerKey, setAddPickerKey] = useState(0);
  const [editPickerKey, setEditPickerKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteToken, setDeleteToken] = useState(0);
  const [deleteError, setDeleteError] = useState("");

  const groups = catalogGroups(countryCatalog);
  const rulesLocked = Boolean(rulesError);
  const repeatedCountries = duplicateCountryNames(rules);
  const busy = fetcher.state !== "idle";
  const savingAdd = busy && pendingIntent.current === "create-rule";
  const savingEdit = busy && pendingIntent.current === "update-rule";
  const savingDelete = busy && pendingIntent.current === "delete-rule";
  const showMarkets = shouldShowMarketsCard(markets);
  const showMarketsSection = showMarkets || Boolean(marketsError);
  const countryListRule = rules.find((rule) => rule.id === countryListRuleId) || null;
  const shopHandle = String(shop || "").replace(/\.myshopify\.com$/i, "");
  const marketsAdminUrl = shopHandle
    ? `https://admin.shopify.com/store/${shopHandle}/markets`
    : "";
  const templates = useEcePopupTemplates({
    addModalRef,
    setDraft: setAddDraft,
    disabled: busy,
  });

  useEffect(() => {
    if (addPickerKey === 0) return;
    addModalRef.current?.showOverlay();
  }, [addPickerKey]);

  useEffect(() => {
    if (editPickerKey === 0) return;
    editModalRef.current?.showOverlay();
  }, [editPickerKey]);

  useEffect(() => {
    if (deleteToken === 0) return;
    deleteModalRef.current?.showOverlay();
  }, [deleteToken]);

  useEffect(() => {
    if (countryListToken === 0) return;
    countriesModalRef.current?.showOverlay();
  }, [countryListToken]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (handledResult.current === fetcher.data) return;
    handledResult.current = fetcher.data;
    const result = fetcher.data;
    pendingIntent.current = "";

    if (result.intent === "set-markets-routing") {
      if (!result.ok) {
        setMarketsOn(marketsBeforeSave.current);
        shopify.toast.show(
          result.formError || "Shopify Markets routing could not be saved.",
        );
      } else {
        shopify.toast.show(
          result.marketsRoutingOn
            ? "Shopify Markets routing is on"
            : "Shopify Markets routing is off",
        );
      }
      return;
    }

    if (!result.ok) {
      if (result.intent === "delete-rule") {
        setDeleteError(result.formError || "The rule could not be deleted.");
        return;
      }
      const apply = result.intent === "update-rule" ? setEditDraft : setAddDraft;
      apply((current) => ({
        ...current,
        nameError: result.nameError || "",
        urlError: result.urlError || "",
        countryError: result.countryError || "",
        formError: result.formError || "The rule could not be saved.",
      }));
      return;
    }

    if (result.intent === "delete-rule") {
      deleteModalRef.current?.hideOverlay();
      setPendingDelete(null);
      setDeleteError("");
      shopify.toast.show("Rule deleted");
      return;
    }

    if (result.intent === "update-rule") {
      editModalRef.current?.hideOverlay();
      shopify.toast.show("Rule saved");
      return;
    }

    addModalRef.current?.hideOverlay();
    setAddDraft(emptyDraft());
    shopify.toast.show("Rule added");
  }, [fetcher.data, fetcher.state, shopify]);

  function openCreate() {
    if (rulesLocked || busy) return;
    setAddDraft(emptyDraft());
    setAddPickerKey((token) => token + 1);
  }

  function openEdit(rule) {
    if (rulesLocked || busy) return;
    setEditDraft({
      id: rule.id || "",
      name: rule.name || "",
      url: rule.url || "",
      countries: rule.countries.map((country) => ({ ...country })),
      nameError: "",
      urlError: "",
      countryError: "",
      formError: "",
    });
    setEditPickerKey((token) => token + 1);
  }

  function submitRule(intent, draft) {
    if (rulesLocked || busy) return;
    const nameError = ruleNameError(draft.name);
    const urlError = destinationUrlError(draft.url);
    const countryError =
      intent === "create-rule" && draft.countries.length === 0
        ? "Choose at least one country."
        : "";
    const formError =
      intent === "update-rule" && !draft.id
        ? "This rule has no id, so it cannot be saved."
        : "";

    if (nameError || urlError || countryError || formError) {
      const apply = intent === "update-rule" ? setEditDraft : setAddDraft;
      apply((current) => ({
        ...current,
        nameError,
        urlError,
        countryError,
        formError,
      }));
      return;
    }

    pendingIntent.current = intent;
    fetcher.submit(ruleFormData(intent, { ...draft, name: draft.name.trim() }), {
      method: "POST",
    });
  }

  function openCountryList(rule) {
    if (!rule?.id) return;
    setCountryListRuleId(rule.id);
    setCountryListToken((token) => token + 1);
  }

  function askDelete(rule) {
    if (rulesLocked || busy) return;
    if (!rule.id) {
      shopify.toast.show("This rule has no id, so it cannot be deleted.");
      return;
    }
    setDeleteError("");
    setPendingDelete(rule);
    setDeleteToken((token) => token + 1);
  }

  function confirmDelete() {
    if (!pendingDelete?.id || rulesLocked || busy) return;
    pendingIntent.current = "delete-rule";
    fetcher.submit(
      ruleFormData("delete-rule", {
        id: pendingDelete.id,
        name: "",
        url: "",
        countries: [],
      }),
      { method: "POST" },
    );
  }

  function changeMarkets(event) {
    if (busy) return;
    const next = Boolean(event.currentTarget.checked);
    marketsBeforeSave.current = marketsOn;
    setMarketsOn(next);
    pendingIntent.current = "set-markets-routing";
    const formData = new FormData();
    formData.set("intent", "set-markets-routing");
    formData.set("enabled", next ? "on" : "off");
    fetcher.submit(formData, { method: "POST" });
  }

  return (
    <s-page id="ece-redirect" heading="Redirect" inlineSize="large">
      <s-button
        id="ece-add-rule"
        slot="primary-action"
        variant="primary"
        disabled={rulesLocked || busy}
        onClick={openCreate}
      >
        Add rule
      </s-button>

      {showMarketsSection ? (
        <s-section id="ece-markets" heading="Shopify Markets">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Markets are shown here for reference. Country routing does not edit them.
            </s-paragraph>
            <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
              <s-switch
                id="ece-markets-switch"
                label="Use Shopify Markets"
                name="ece-markets-switch"
                checked={marketsOn}
                details="When this is off, automatic redirect follows custom rules only. The floating switcher hides countries that are not on a rule."
                disabled={busy}
                onChange={changeMarkets}
              />
              {marketsAdminUrl ? (
                <s-button
                  id="ece-markets-open"
                  href={marketsAdminUrl}
                  target="_blank"
                  variant="secondary"
                >
                  Open Markets
                </s-button>
              ) : (
                <s-button id="ece-markets-open" variant="secondary" disabled>
                  Open Markets
                </s-button>
              )}
            </s-grid>
            {marketsError ? (
              <s-paragraph id="ece-markets-error" tone="critical">
                {marketsError}
              </s-paragraph>
            ) : (
              <s-paragraph id="ece-markets-source" color="subdued">
                Loaded from this shop’s Shopify Markets.
              </s-paragraph>
            )}
            {marketsOn && showMarkets ? (
              <s-section id="ece-markets-table-section" padding="none" accessibilityLabel="Markets">
                <s-table id="ece-markets-table">
                  <s-table-header-row>
                    <s-table-header listSlot="primary">Market</s-table-header>
                    <s-table-header listSlot="inline">Status</s-table-header>
                    <s-table-header listSlot="labeled">Countries</s-table-header>
                  </s-table-header-row>
                  <s-table-body>
                    {markets.map((market, index) => (
                      <s-table-row key={market.id} id={eceMarketRowId(market.id, index)}>
                        <s-table-cell>{market.name}</s-table-cell>
                        <s-table-cell>
                          <s-badge tone={isMarketActive(market.status) ? "success" : "warning"}>
                            {isMarketActive(market.status) ? "Active" : "Inactive"}
                          </s-badge>
                        </s-table-cell>
                        <s-table-cell>
                          {market.countries.length > 0
                            ? market.countries.join(" · ")
                            : "No countries"}
                        </s-table-cell>
                      </s-table-row>
                    ))}
                  </s-table-body>
                </s-table>
              </s-section>
            ) : null}
            {!marketsOn && !marketsError ? (
              <s-paragraph>
                Markets routing is off. Automatic redirect will ignore these markets.
              </s-paragraph>
            ) : null}
          </s-stack>
        </s-section>
      ) : null}

      <s-section id="ece-rules" heading="Redirection rules" padding="none">
        <s-box padding="base">
          <s-stack direction="block" gap="base">
            <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
              <s-paragraph>
                A custom rule wins over Shopify Markets until the visitor is already on that destination. Add as many rules as you need. Each country can belong to one rule.
              </s-paragraph>
              <s-button
                id="ece-rules-add"
                variant="primary"
                disabled={rulesLocked || busy}
                onClick={openCreate}
              >
                Add rule
              </s-button>
            </s-grid>
            {rulesError ? (
              <s-banner id="ece-rules-error" tone="critical" heading="Rules were not loaded">
                {rulesError}
              </s-banner>
            ) : null}
            {repeatedCountries.length > 0 ? (
              <s-banner id="ece-rules-duplicate" tone="warning" heading="A country is on more than one rule">
                {repeatedCountries.join(" · ")}. Edit a rule so each country is listed once.
              </s-banner>
            ) : null}
            {!rulesError && rules.length === 0 ? (
              <s-paragraph id="ece-rules-empty">No rules present</s-paragraph>
            ) : null}
          </s-stack>
        </s-box>
        {!rulesError && rules.length > 0 ? (
          <s-table id="ece-rules-table" variant="table">
            <s-table-header-row>
              <s-table-header listSlot="primary">Name</s-table-header>
              <s-table-header listSlot="labeled">URL</s-table-header>
              <s-table-header listSlot="labeled">Countries</s-table-header>
              <s-table-header listSlot="labeled">Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {rules.map((rule) => (
                <s-table-row key={rule.id} id={`ece-rule-row-${rule.id}`}>
                  <s-table-cell>{displayRuleName(rule.name)}</s-table-cell>
                  <s-table-cell>
                    <EceUrlCell
                      ruleId={rule.id}
                      url={rule.url}
                      expanded={Boolean(expandedUrls[rule.id])}
                      onToggle={() =>
                        setExpandedUrls((current) => ({
                          ...current,
                          [rule.id]: !current[rule.id],
                        }))
                      }
                    />
                  </s-table-cell>
                  <s-table-cell>
                    <EceCountryCell
                      ruleId={rule.id}
                      countries={rule.countries}
                      onMore={() => openCountryList(rule)}
                    />
                  </s-table-cell>
                  <s-table-cell>
                    <s-stack
                      id={`ece-rule-actions-${rule.id}`}
                      direction="inline"
                      gap="small-200"
                      alignItems="center"
                    >
                      <s-button
                        id={`ece-rule-edit-${rule.id}`}
                        variant="secondary"
                        disabled={!rule.id || busy}
                        onClick={() => openEdit(rule)}
                      >
                        Edit rule
                      </s-button>
                      <s-button
                        id={`ece-rule-delete-${rule.id}`}
                        variant="secondary"
                        tone="critical"
                        disabled={!rule.id || busy}
                        onClick={() => askDelete(rule)}
                      >
                        Delete rule
                      </s-button>
                    </s-stack>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        ) : null}
      </s-section>

      <EceAddRuleModal
        modalRef={addModalRef}
        draft={addDraft}
        setDraft={setAddDraft}
        groups={groups}
        taken={takenCountryKeys(rules)}
        pickerKey={addPickerKey}
        saving={savingAdd}
        onSave={() => submitRule("create-rule", addDraft)}
        onBrowseTemplates={templates.openTemplates}
      />
      <EcePopupTemplatesModal
        {...templates.modalProps}
        selectedId={addDraft.popupTemplateId}
      />
      <EceEditRuleModal
        modalRef={editModalRef}
        draft={editDraft}
        setDraft={setEditDraft}
        groups={groups}
        taken={takenCountryKeys(rules, editDraft.id)}
        pickerKey={editPickerKey}
        saving={savingEdit}
        onSave={() => submitRule("update-rule", editDraft)}
      />

      <s-modal
        id="ece-countries-modal"
        ref={countriesModalRef}
        heading={`Countries for ${displayRuleName(countryListRule?.name)}`}
        accessibilityLabel={`Countries for ${displayRuleName(countryListRule?.name)}`}
      >
        <s-stack direction="block" gap="base">
          <s-paragraph>
            {countryListRule
              ? `${countryListRule.countries.length} ${
                  countryListRule.countries.length === 1 ? "country" : "countries"
                } on this rule.`
              : "This rule is no longer in the table."}
          </s-paragraph>
          {countryListRule && countryListRule.countries.length > 0 ? (
            <s-stack id="ece-countries-modal-list" direction="inline" gap="small-200">
              {countryListRule.countries.map((country) => (
                <s-chip key={country.code} id={`ece-modal-chip-${country.code}`}>
                  {country.name}
                </s-chip>
              ))}
            </s-stack>
          ) : null}
        </s-stack>
        <s-button
          id="ece-countries-modal-close"
          slot="primary-action"
          variant="primary"
          commandFor="ece-countries-modal"
          command="--hide"
        >
          Close
        </s-button>
      </s-modal>

      <s-modal
        id="ece-delete-modal"
        ref={deleteModalRef}
        heading="Delete rule?"
        size="small"
      >
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Delete {displayRuleName(pendingDelete?.name)}? The rule is removed from this shop after you confirm.
          </s-paragraph>
          {deleteError ? <s-text tone="critical">{deleteError}</s-text> : null}
        </s-stack>
        <s-button
          id="ece-delete-confirm"
          slot="primary-action"
          variant="primary"
          tone="critical"
          loading={savingDelete}
          onClick={confirmDelete}
        >
          Delete rule
        </s-button>
        <s-button
          id="ece-delete-cancel"
          slot="secondary-actions"
          variant="secondary"
          commandFor="ece-delete-modal"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>
    </s-page>
  );
}

function eceMarketRowId(id, index) {
  const slug = String(id || index)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `ece-market-${slug || index}`;
}

function EceUrlCell({ ruleId, url, expanded, onToggle }) {
  const truncated = url.length > ECE_URL_PREVIEW_LENGTH;
  return (
    <span id={`ece-url-${ruleId}`} className="ece-url">
      <s-stack direction="inline" gap="small-200" alignItems="center">
        <s-text>{expanded || !truncated ? url : url.slice(0, ECE_URL_PREVIEW_LENGTH)}</s-text>
        {truncated ? (
          <s-button
            id={`ece-url-toggle-${ruleId}`}
            variant="tertiary"
            accessibilityLabel={expanded ? "Hide full URL" : "Show full URL"}
            onClick={onToggle}
          >
            {expanded ? "Hide" : "..."}
          </s-button>
        ) : null}
      </s-stack>
    </span>
  );
}

function EceCountryCell({ ruleId, countries, onMore }) {
  const visible = countries.slice(0, ECE_COUNTRY_PREVIEW_COUNT);
  const hiddenCount = countries.length - visible.length;

  if (countries.length === 0) {
    return <s-text color="subdued">No countries</s-text>;
  }

  return (
    <s-stack id={`ece-rule-countries-${ruleId}`} direction="inline" gap="small-200">
      {visible.map((country) => (
        <s-chip key={country.code} id={`ece-chip-${ruleId}-${country.code}`}>
          {country.name}
        </s-chip>
      ))}
      {hiddenCount > 0 ? (
        <s-button
          id={`ece-countries-more-${ruleId}`}
          variant="tertiary"
          accessibilityLabel={`Show all ${countries.length} countries`}
          onClick={onMore}
        >
          More
        </s-button>
      ) : null}
    </s-stack>
  );
}

function ruleFormData(intent, draft) {
  const formData = new FormData();
  formData.set("intent", intent);
  formData.set("ruleId", draft.id || "");
  formData.set("name", draft.name || "");
  formData.set("url", draft.url || "");
  formData.set(
    "countryCodes",
    JSON.stringify((draft.countries || []).map((country) => country.code)),
  );
  return formData;
}
