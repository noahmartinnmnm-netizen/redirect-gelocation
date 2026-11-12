/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { useFetcher, useSearchParams } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import popupCss from "./ecePopupPage.css?inline";
import { EcePopupPreview, previewNotice, scenarioCountry } from "./EcePopupPreview";
import {
  ECE_COLOR_PRESETS,
  ECE_COUNTRY_TOKEN,
  ECE_FLAG_TOKEN,
  ECE_POPUP_TEMPLATES,
  ECE_POPUP_WIDTH_MAX,
  ECE_POPUP_WIDTH_MIN,
  ECE_PREVIEW_COUNTRIES,
  ECE_STORE_COUNTRY,
  defaultPopupDesign,
  defaultPopupDesigns,
  popupDesignFingerprint,
  previewCountry,
} from "./ecePopupDesigns";

const TABS = [
  { id: "content", label: "Content" },
  { id: "style", label: "Style" },
  { id: "behavior", label: "Behavior" },
];

const SCENARIOS = [
  { id: "new", label: "First visit from another country" },
  { id: "inMarket", label: "Visitor already in this market" },
  { id: "noDestination", label: "Country with no rule or market" },
  { id: "returning", label: "Visitor who closed it earlier" },
];

const COLOR_FIELDS = [
  { key: "background", label: "Background" },
  { key: "accent", label: "Accent" },
  { key: "headingColor", label: "Heading" },
  { key: "messageColor", label: "Message" },
  { key: "primaryBackground", label: "Primary button" },
  { key: "primaryText", label: "Primary text" },
  { key: "secondaryBackground", label: "Secondary button" },
  { key: "secondaryText", label: "Secondary text" },
];

const DROPDOWN_COLOR_FIELDS = [
  { key: "dropdownBackground", label: "Dropdown background" },
  { key: "dropdownText", label: "Dropdown text" },
];

const POPUP_SAVE_BAR_ID = "ece-popup-save-bar";

function cloneDesign(design) {
  return {
    templateId: design.templateId,
    content: { ...design.content },
    style: { ...design.style },
    preferences: { ...design.preferences },
  };
}

function fieldValue(event) {
  const target = event.currentTarget || event.target;
  return target?.value ?? "";
}

function fieldChecked(event) {
  const target = event.currentTarget || event.target;
  return Boolean(target?.checked);
}

function knownTemplateId(id) {
  return ECE_POPUP_TEMPLATES.some((item) => item.id === id) ? id : "";
}

function designsWithSaved(savedDesign) {
  const designs = defaultPopupDesigns();
  const templateId = knownTemplateId(savedDesign?.templateId);
  if (!templateId) return designs;
  designs[templateId] = {
    templateId,
    content: { ...savedDesign.content },
    style: { ...savedDesign.style },
    preferences: { ...savedDesign.preferences },
  };
  return designs;
}

export function EcePopupPage({ savedDesign = null, designError = "" }) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const handledResult = useRef(null);
  const submittedFingerprint = useRef("");
  const [searchParams] = useSearchParams();
  const requestedTemplate = knownTemplateId(searchParams.get("template"));
  const initialTemplateId =
    requestedTemplate ||
    knownTemplateId(savedDesign?.templateId) ||
    ECE_POPUP_TEMPLATES[0].id;
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [designs, setDesigns] = useState(() => designsWithSaved(savedDesign));
  const [baselineDesign, setBaselineDesign] = useState(() =>
    cloneDesign(
      savedDesign?.templateId && !designError
        ? {
            templateId: savedDesign.templateId,
            content: savedDesign.content,
            style: savedDesign.style,
            preferences: savedDesign.preferences,
          }
        : defaultPopupDesign(initialTemplateId),
    ),
  );
  const [baseline, setBaseline] = useState(() => {
    if (designError) return "";
    return popupDesignFingerprint(
      savedDesign?.templateId ? savedDesign : defaultPopupDesign(initialTemplateId),
    );
  });
  const [published, setPublished] = useState(Boolean(savedDesign) && !designError);
  const [loadError, setLoadError] = useState(designError || "");
  const [saveError, setSaveError] = useState("");
  const [tab, setTab] = useState("content");
  const [device, setDevice] = useState("desktop");
  const [visitorCode, setVisitorCode] = useState("FR");
  const [languageCode, setLanguageCode] = useState("");
  const [scenario, setScenario] = useState("new");
  const [outcome, setOutcome] = useState("");

  useEffect(() => {
    if (!requestedTemplate) return;
    setTemplateId(requestedTemplate);
    setOutcome("");
  }, [requestedTemplate]);

  const design = designs[templateId];
  const template = ECE_POPUP_TEMPLATES.find((item) => item.id === templateId);
  const isSelector = template.kind === "selector";
  const saving = fetcher.state !== "idle";
  const dirty = popupDesignFingerprint(design) !== baseline;
  const changed =
    JSON.stringify(design) !== JSON.stringify(defaultPopupDesign(templateId));
  const noteSaved = published && !dirty && !saveError && !loadError;
  let statusNote = "Change anything in this design, then save it for your storefront popup.";
  if (saving) statusNote = "Saving this design to your shop.";
  else if (saveError) statusNote = saveError;
  else if (loadError) statusNote = loadError;
  else if (dirty) {
    statusNote = "You have unsaved changes. Save publishes this design to your storefront popup.";
  } else if (published) {
    statusNote = "Saved. Your storefront popup uses this design.";
  }
  const storeCountry = previewCountry(ECE_STORE_COUNTRY);
  const country = scenarioCountry(scenario, visitorCode, ECE_STORE_COUNTRY);
  const notice = previewNotice({ design, scenario, outcome, country, storeCountry });

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (handledResult.current === fetcher.data) return;
    handledResult.current = fetcher.data;
    const result = fetcher.data;

    if (!result.ok) {
      const message = result.error || "The popup design could not be saved.";
      // Keep errors on the page — BFS 4.2.4 rejects auto-dismissing error toasts.
      setSaveError(message);
      return;
    }

    const nextFingerprint = popupDesignFingerprint(result.design);
    const saved = cloneDesign(result.design);
    setBaseline(nextFingerprint);
    setBaselineDesign(saved);
    setPublished(true);
    setLoadError("");
    setSaveError("");
    setDesigns((current) => {
      const activeId = result.design.templateId;
      const active = current[activeId];
      if (!active || popupDesignFingerprint(active) !== submittedFingerprint.current) {
        return current;
      }
      return {
        ...current,
        [activeId]: saved,
      };
    });
    shopify.toast.show("Popup design saved");
  }, [fetcher.state, fetcher.data, shopify]);

  useEffect(() => {
    if (!shopify?.saveBar) return;
    if (dirty) shopify.saveBar.show(POPUP_SAVE_BAR_ID);
    else shopify.saveBar.hide(POPUP_SAVE_BAR_ID);
  }, [dirty, shopify]);

  useEffect(() => {
    return () => {
      shopify?.saveBar?.hide?.(POPUP_SAVE_BAR_ID);
    };
  }, [shopify]);

  function update(group, key, value) {
    setDesigns((current) => ({
      ...current,
      [templateId]: {
        ...current[templateId],
        [group]: { ...current[templateId][group], [key]: value },
      },
    }));
    setSaveError("");
    setOutcome("");
  }

  function applyPreset(preset) {
    setDesigns((current) => ({
      ...current,
      [templateId]: {
        ...current[templateId],
        style: { ...current[templateId].style, ...preset.colors },
      },
    }));
    setSaveError("");
    setOutcome("");
  }

  function resetDesign() {
    setDesigns((current) => ({ ...current, [templateId]: defaultPopupDesign(templateId) }));
    setSaveError("");
    setOutcome("");
    shopify.toast.show(`${template.name} reset to its default look`);
  }

  function saveDesign() {
    if (!dirty || saving) return;
    submittedFingerprint.current = popupDesignFingerprint(design);
    setSaveError("");
    const formData = new FormData();
    formData.set("design", JSON.stringify(design));
    fetcher.submit(formData, { method: "POST" });
  }

  function discardDesign() {
    if (saving) return;
    const restored = cloneDesign(baselineDesign);
    setTemplateId(restored.templateId);
    setDesigns((current) => ({
      ...current,
      [restored.templateId]: restored,
    }));
    setSaveError("");
    setOutcome("");
  }

  function chooseTemplate(id) {
    setTemplateId(id);
    setSaveError("");
    setOutcome("");
  }

  function chooseVisitor(code) {
    setVisitorCode(code);
    setLanguageCode("");
    setOutcome("");
    if (scenario === "inMarket") setScenario("new");
  }

  async function copyToken(token) {
    try {
      await navigator.clipboard.writeText(token);
      shopify.toast.show(`${token} copied. Paste it into any text field.`);
    } catch {
      shopify.toast.show(`Type ${token} into any text field.`);
    }
  }

  return (
    <s-page id="ece-popup" heading="Popup" inlineSize="large">
      <s-link slot="breadcrumb-actions" href="/app">
        Dashboard
      </s-link>
      <ui-save-bar id={POPUP_SAVE_BAR_ID}>
        <button
          id="ece-popup-save-bar-save"
          variant="primary"
          disabled={!dirty || saving}
          onClick={saveDesign}
        >
          Save
        </button>
        <button
          id="ece-popup-save-bar-discard"
          disabled={saving}
          onClick={discardDesign}
        >
          Discard
        </button>
      </ui-save-bar>
      <s-button
        id="ece-popup-save"
        slot="primary-action"
        variant="primary"
        disabled={!dirty || saving}
        loading={saving}
        onClick={saveDesign}
      >
        Save
      </s-button>
      <s-button
        id="ece-popup-reset"
        slot="secondary-actions"
        disabled={!changed || saving}
        onClick={resetDesign}
      >
        Reset design
      </s-button>

      <div className="ece-popup">
        <style dangerouslySetInnerHTML={{ __html: popupCss }} />

        <div className="ece-popup__phone-note" role="note">
          This editor is built for desktop. Open it on a computer for the full preview.
        </div>

        <div
          className={`ece-popup__draft-note${
            saveError || loadError ? " is-error" : noteSaved ? " is-saved" : ""
          }`}
          role={saveError || loadError ? "alert" : "note"}
        >
          <span className="ece-popup__draft-dot" aria-hidden="true" />
          {statusNote}
        </div>

        <section className="ece-popup__templates" aria-label="Popup designs">
          {ECE_POPUP_TEMPLATES.map((item) => {
            const selected = item.id === templateId;
            return (
              <button
                key={item.id}
                type="button"
                id={`ece-popup-template-${item.id}`}
                className={`ece-popup__template${selected ? " is-selected" : ""}`}
                aria-pressed={selected}
                onClick={() => chooseTemplate(item.id)}
              >
                <TemplateThumb kind={item.kind} style={designs[item.id].style} />
                <span className="ece-popup__template-text">
                  <span className="ece-popup__template-top">
                    <span className="ece-popup__template-name">{item.name}</span>
                    <span className={`ece-popup__kind is-${item.kind}`}>{item.kindLabel}</span>
                  </span>
                  <span className="ece-popup__template-summary">{item.summary}</span>
                </span>
                <span className="ece-popup__template-check" aria-hidden="true">
                  {selected ? <CheckGlyph /> : null}
                </span>
              </button>
            );
          })}
        </section>

        <div className="ece-popup__workspace">
          <aside className="ece-popup__panel" aria-label="Popup settings">
            <div className="ece-popup__panel-head">
              <div>
                <span className="ece-popup__eyebrow">Editing</span>
                <h2 className="ece-popup__panel-title">{template.name}</h2>
              </div>
              {dirty ? <span className="ece-popup__changed">Unsaved</span> : null}
            </div>

            <div className="ece-popup__tabs" role="tablist" aria-label="Settings groups">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`ece-popup-tab-${item.id}`}
                  aria-selected={tab === item.id}
                  aria-controls={`ece-popup-tabpanel-${item.id}`}
                  className={`ece-popup__tab${tab === item.id ? " is-selected" : ""}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div
              className="ece-popup__tabpanel"
              id={`ece-popup-tabpanel-${tab}`}
              role="tabpanel"
              aria-labelledby={`ece-popup-tab-${tab}`}
            >
              {tab === "content" ? (
                <ContentSettings
                  design={design}
                  isSelector={isSelector}
                  update={update}
                  copyToken={copyToken}
                />
              ) : null}
              {tab === "style" ? (
                <StyleSettings
                  design={design}
                  isSelector={isSelector}
                  update={update}
                  applyPreset={applyPreset}
                />
              ) : null}
              {tab === "behavior" ? (
                <BehaviorSettings design={design} isSelector={isSelector} update={update} />
              ) : null}
            </div>
          </aside>

          <section className="ece-popup__preview" aria-label="Live preview">
            <div className="ece-popup__toolbar">
              <div className="ece-popup__toolbar-group">
                <label className="ece-popup__mini-field">
                  <span>Visitor from</span>
                  <select
                    id="ece-popup-visitor"
                    value={scenario === "inMarket" ? ECE_STORE_COUNTRY : visitorCode}
                    disabled={scenario === "inMarket"}
                    onChange={(event) => chooseVisitor(event.target.value)}
                  >
                    {ECE_PREVIEW_COUNTRIES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ece-popup__mini-field">
                  <span>Situation</span>
                  <select
                    id="ece-popup-scenario"
                    value={scenario}
                    onChange={(event) => {
                      setScenario(event.target.value);
                      setOutcome("");
                    }}
                  >
                    {SCENARIOS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="ece-popup__device" role="group" aria-label="Preview size">
                <button
                  type="button"
                  aria-pressed={device === "desktop"}
                  className={device === "desktop" ? "is-selected" : ""}
                  onClick={() => setDevice("desktop")}
                >
                  <DeviceGlyph name="desktop" />
                  Desktop
                </button>
                <button
                  type="button"
                  aria-pressed={device === "mobile"}
                  className={device === "mobile" ? "is-selected" : ""}
                  onClick={() => setDevice("mobile")}
                >
                  <DeviceGlyph name="mobile" />
                  Mobile
                </button>
              </div>
            </div>

            <div className="ece-popup__canvas">
              <EcePopupPreview
                design={design}
                device={device}
                country={country}
                languageCode={languageCode}
                notice={notice}
                onCountryChange={chooseVisitor}
                onLanguageChange={setLanguageCode}
                onClose={() => setOutcome("closed")}
                onStay={() => setOutcome("stayed")}
                onConfirm={() => setOutcome("confirmed")}
                onReplay={() => {
                  setOutcome("");
                  setScenario("new");
                }}
              />
            </div>

            <p className="ece-popup__caption">
              Your store is in {storeCountry.name}. Buttons in the preview are clickable, so you
              can try what a visitor sees.
            </p>
          </section>
        </div>
      </div>
    </s-page>
  );
}

function ContentSettings({ design, isSelector, update, copyToken }) {
  const { content, preferences } = design;
  return (
    <div className="ece-popup__groups">
      <SettingGroup
        title="Text"
        hint="Use the tokens to show the visitor's country. A flag next to the country name shows as one badge."
      >
        <div className="ece-popup__tokens">
          {[ECE_COUNTRY_TOKEN, ECE_FLAG_TOKEN].map((token) => (
            <button
              key={token}
              type="button"
              className="ece-popup__token"
              onClick={() => copyToken(token)}
            >
              <CopyGlyph />
              {token}
            </button>
          ))}
        </div>
        <s-text-field
          id="ece-popup-heading"
          label="Heading"
          value={content.heading}
          onInput={(event) => update("content", "heading", fieldValue(event))}
        />
        <s-text-area
          id="ece-popup-message"
          label="Message"
          rows={3}
          value={content.message}
          onInput={(event) => update("content", "message", fieldValue(event))}
        />
      </SettingGroup>

      <SettingGroup
        title="Buttons"
        hint="Buttons show plain text, so a flag token is left out. Clear a field to hide that button."
      >
        <s-text-field
          id="ece-popup-primary"
          label="Primary button"
          value={content.primaryButton}
          onInput={(event) => update("content", "primaryButton", fieldValue(event))}
        />
        <s-text-field
          id="ece-popup-secondary"
          label={isSelector ? "Secondary link" : "Secondary button"}
          value={content.secondaryButton}
          onInput={(event) => update("content", "secondaryButton", fieldValue(event))}
        />
        <s-switch
          id="ece-popup-uppercase"
          label="Uppercase country name in buttons"
          checked={preferences.uppercaseCountry}
          onChange={(event) => update("preferences", "uppercaseCountry", fieldChecked(event))}
        />
      </SettingGroup>

      {isSelector ? (
        <SettingGroup title="Header image" hint="Shown across the top of the popup.">
          <s-switch
            id="ece-popup-header"
            label="Show header image"
            checked={preferences.headerImage}
            onChange={(event) => update("preferences", "headerImage", fieldChecked(event))}
          />
          {preferences.headerImage ? (
            <s-text-field
              id="ece-popup-header-url"
              label="Image URL"
              placeholder="https://cdn.shopify.com/..."
              value={preferences.headerImageUrl}
              details="Leave empty to use the built-in illustration in your accent color."
              onInput={(event) =>
                update("preferences", "headerImageUrl", fieldValue(event).trim())
              }
            />
          ) : null}
        </SettingGroup>
      ) : null}
    </div>
  );
}

function StyleSettings({ design, isSelector, update, applyPreset }) {
  const { style } = design;
  const colorFields = isSelector ? [...COLOR_FIELDS, ...DROPDOWN_COLOR_FIELDS] : COLOR_FIELDS;

  return (
    <div className="ece-popup__groups">
      <SettingGroup title="Quick themes" hint="Start from a palette, then fine-tune any color.">
        <div className="ece-popup__presets">
          {ECE_COLOR_PRESETS.map((preset) => {
            const colors = { ...style, ...preset.colors };
            const active = Object.entries(preset.colors).every(
              ([key, value]) => style[key]?.toLowerCase() === value.toLowerCase(),
            );
            return (
              <button
                key={preset.id}
                type="button"
                className={`ece-popup__preset${active ? " is-selected" : ""}`}
                aria-pressed={active}
                onClick={() => applyPreset(preset)}
              >
                <span className="ece-popup__preset-swatch" style={{ background: colors.background }}>
                  <span style={{ background: colors.headingColor }} />
                  <span style={{ background: colors.primaryBackground }} />
                  <span style={{ background: colors.accent }} />
                </span>
                {preset.name}
              </button>
            );
          })}
        </div>
      </SettingGroup>

      <SettingGroup title="Size and shape">
        <RangeField
          id="ece-popup-width"
          label="Popup width"
          value={style.width}
          min={ECE_POPUP_WIDTH_MIN}
          max={ECE_POPUP_WIDTH_MAX}
          suffix="rem"
          onChange={(value) => update("style", "width", value)}
        />
        <RangeField
          id="ece-popup-radius"
          label="Corner radius"
          value={style.radius}
          min={0}
          max={32}
          suffix="px"
          onChange={(value) => update("style", "radius", value)}
        />
        <RangeField
          id="ece-popup-heading-size"
          label="Heading size"
          value={style.headingSize}
          min={16}
          max={36}
          suffix="px"
          onChange={(value) => update("style", "headingSize", value)}
        />
        <RangeField
          id="ece-popup-backdrop"
          label="Page dimming"
          value={style.backdrop}
          min={0}
          max={80}
          suffix="%"
          onChange={(value) => update("style", "backdrop", value)}
        />
        <s-switch
          id="ece-popup-glass"
          label="Glass effect"
          details="Makes the popup slightly see-through with a soft blur behind it."
          checked={style.glass}
          onChange={(event) => update("style", "glass", fieldChecked(event))}
        />
      </SettingGroup>

      <SettingGroup title="Colors">
        <div className="ece-popup__colors">
          {colorFields.map((field) => (
            <ColorField
              key={field.key}
              id={`ece-popup-color-${field.key}`}
              label={field.label}
              value={style[field.key]}
              onChange={(value) => update("style", field.key, value)}
            />
          ))}
        </div>
      </SettingGroup>
    </div>
  );
}

function BehaviorSettings({ design, isSelector, update }) {
  const { preferences } = design;
  const toggle = (key) => (event) => update("preferences", key, fieldChecked(event));

  return (
    <div className="ece-popup__groups">
      <SettingGroup title="Popup controls">
        <s-switch
          id="ece-popup-close"
          label="Show close button"
          details="Visitors can dismiss the popup with an X in the corner."
          checked={preferences.closeButton}
          onChange={toggle("closeButton")}
        />
        {isSelector ? (
          <>
            <s-switch
              id="ece-popup-languages"
              label="Show language selector"
              checked={preferences.showLanguages}
              onChange={toggle("showLanguages")}
            />
            {preferences.showLanguages ? (
              <s-switch
                id="ece-popup-language-name"
                label="Show language name"
                details="On shows “Français”. Off shows the code “FR”."
                checked={preferences.showLanguageName}
                onChange={toggle("showLanguageName")}
              />
            ) : null}
            <s-switch
              id="ece-popup-currency-code"
              label="Show currency code"
              details="For example EUR next to the country."
              checked={preferences.showCurrencyCode}
              onChange={toggle("showCurrencyCode")}
            />
            <s-switch
              id="ece-popup-currency-symbol"
              label="Show currency symbol"
              details="For example € next to the country."
              checked={preferences.showCurrencySymbol}
              onChange={toggle("showCurrencySymbol")}
            />
          </>
        ) : null}
      </SettingGroup>

      <SettingGroup
        title="When to hide"
        hint="Try these with the Situation menu above the preview."
      >
        <s-switch
          id="ece-popup-hide-market"
          label="Hide when already in this market"
          details="A visitor already shopping in their own market isn't asked to move. A custom rule for their country still shows the popup."
          checked={preferences.hideInCurrentMarket}
          onChange={toggle("hideInCurrentMarket")}
        />
        <s-switch
          id="ece-popup-hide-nowhere"
          label="Hide when there is nowhere to send them"
          details="Hides the popup when no rule or other market covers the visitor's country."
          checked={preferences.hideWithoutDestination}
          onChange={toggle("hideWithoutDestination")}
        />
      </SettingGroup>

      <SettingGroup title="After the visitor chooses">
        <s-switch
          id="ece-popup-preserve"
          label="Keep the page they were viewing"
          details="A visitor on /products/linen-shirt lands on the same product in the new store."
          checked={preferences.preserveRelativePath}
          onChange={toggle("preserveRelativePath")}
        />
        <s-number-field
          id="ece-popup-cookie"
          label="Hide again for"
          suffix="minutes"
          min={1}
          max={10080}
          step={1}
          value={String(preferences.cookieMinutes)}
          details="After a visitor closes or confirms, the popup stays hidden this long."
          onInput={(event) => {
            const minutes = Math.round(Number(fieldValue(event)));
            if (Number.isFinite(minutes) && minutes >= 1) {
              update("preferences", "cookieMinutes", minutes);
            }
          }}
        />
      </SettingGroup>
    </div>
  );
}

function SettingGroup({ title, hint, children }) {
  return (
    <div className="ece-popup__group">
      <div className="ece-popup__group-head">
        <h3 className="ece-popup__group-title">{title}</h3>
        {hint ? <p className="ece-popup__group-hint">{hint}</p> : null}
      </div>
      <div className="ece-popup__group-body">{children}</div>
    </div>
  );
}

function RangeField({ id, label, value, min, max, step = 1, suffix, onChange }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="ece-popup__range">
      <div className="ece-popup__range-head">
        <label htmlFor={id}>{label}</label>
        <span className="ece-popup__range-value">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--fill": `${fill}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function ColorField({ id, label, value, onChange }) {
  return (
    <label className="ece-popup__color" htmlFor={id}>
      <span className="ece-popup__color-swatch" style={{ background: value }}>
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      <span className="ece-popup__color-label">{label}</span>
      <span className="ece-popup__color-value">{value.toUpperCase()}</span>
    </label>
  );
}

function TemplateThumb({ kind, style }) {
  return (
    <span
      className={`ece-popup__thumb is-${kind}`}
      style={{
        "--thumb-bg": style.background,
        "--thumb-accent": style.accent,
        "--thumb-heading": style.headingColor,
        "--thumb-message": style.messageColor,
        "--thumb-primary": style.primaryBackground,
        "--thumb-dropdown": style.dropdownBackground,
      }}
      aria-hidden="true"
    >
      <span className="ece-popup__thumb-card">
        {kind === "selector" ? <span className="ece-popup__thumb-header" /> : null}
        {kind === "confirm" ? <span className="ece-popup__thumb-flag" /> : null}
        <span className="ece-popup__thumb-line is-heading" />
        <span className="ece-popup__thumb-line" />
        {kind === "selector" ? (
          <>
            <span className="ece-popup__thumb-select" />
            <span className="ece-popup__thumb-select" />
          </>
        ) : null}
        <span className="ece-popup__thumb-btn" />
        {kind === "confirm" ? <span className="ece-popup__thumb-btn is-ghost" /> : null}
      </span>
    </span>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M4.5 10.4 8.2 14l7.3-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="7" y="7" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M13 4.5H6A1.5 1.5 0 0 0 4.5 6v7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DeviceGlyph({ name }) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      {name === "desktop" ? (
        <>
          <rect x="2.5" y="4" width="15" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 16.5h6M10 13.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <rect x="6" y="2.5" width="8" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 14.8h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
