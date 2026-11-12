/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import blockerCss from "./eceCountryBlockerPage.css?inline";
import { EceCountryPicker } from "./EceCountryPicker";
import { catalogGroups, indexCountryCatalog } from "./eceRuleModel";
import {
  ECE_BLOCKER_HEADING_MAX,
  ECE_BLOCKER_HEADING_MIN,
  ECE_BLOCKER_TEMPLATES,
  ECE_BLOCKER_WIDTH_MAX,
  ECE_BLOCKER_WIDTH_MIN,
  blockerDesignFingerprint,
  defaultBlockerDesign,
  defaultBlockerDesigns,
  emptyCountryBlocker,
  ipv4Error,
  normalizeIpv4List,
  normalizeRangeList,
  normalizeWhitelist,
  rangeEntryError,
  canonicalIpv4,
  canonicalRange,
} from "./eceCountryBlocker";

const OPEN_TAKEN = { codes: new Set(), names: new Set() };

const COLOR_FIELDS = [
  { key: "background", label: "Background" },
  { key: "overlay", label: "Overlay" },
  { key: "text", label: "Text" },
  { key: "accent", label: "Accent" },
];

const SAVED_LABEL = {
  design: "Country blocker design saved",
  countries: "Blocked countries saved",
  ips: "Blocked IPs saved",
  ranges: "Blocked IP ranges saved",
  whitelist: "Allowed IPs saved",
};

const BLOCKER_SAVE_BAR_ID = "ece-blocker-save-bar";

function knownTemplateId(id) {
  return ECE_BLOCKER_TEMPLATES.some((item) => item.id === id) ? id : "";
}

function sameList(left, right) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
}

function countriesFromCodes(codes, countryCatalog) {
  const index = indexCountryCatalog(countryCatalog);
  return (codes || []).map((code) => index.get(code)).filter(Boolean);
}

function fieldValue(event) {
  const target = event.currentTarget || event.target;
  return target?.value ?? "";
}

export function EceCountryBlockerPage({
  blocker = null,
  blockerError = "",
  countryCatalog,
  embedActive = false,
  embedError = "",
  editorUrl = "",
}) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const handled = useRef(null);
  const pendingIntent = useRef("");
  const submitted = useRef(null);
  const whitelistRollback = useRef(null);
  const groups = useMemo(() => catalogGroups(countryCatalog), [countryCatalog]);
  const initialTemplate =
    knownTemplateId(blocker?.design?.templateId) || ECE_BLOCKER_TEMPLATES[0].id;

  const [templateId, setTemplateId] = useState(initialTemplate);
  const [designs, setDesigns] = useState(() => {
    const next = defaultBlockerDesigns();
    const savedId = knownTemplateId(blocker?.design?.templateId);
    if (savedId && blocker?.design) {
      next[savedId] = {
        templateId: savedId,
        content: { ...blocker.design.content },
        style: { ...blocker.design.style },
      };
    }
    return next;
  });
  const [saved, setSaved] = useState(() => blocker || emptyCountryBlocker());
  const [countries, setCountries] = useState(() =>
    countriesFromCodes(blocker?.blockedCountries, countryCatalog),
  );
  const [ips, setIps] = useState(() => blocker?.blockedIps || []);
  const [ranges, setRanges] = useState(() => blocker?.blockedIpRanges || []);
  const [whitelist, setWhitelist] = useState(() => blocker?.whitelistedIps || []);
  const [ipDraft, setIpDraft] = useState("");
  const [rangeDraft, setRangeDraft] = useState("");
  const [whitelistDraft, setWhitelistDraft] = useState("");
  const [errors, setErrors] = useState({
    design: "",
    countries: "",
    ips: "",
    ranges: "",
    whitelist: "",
  });
  const [loadError, setLoadError] = useState(blockerError || "");

  const design = designs[templateId];
  const template = ECE_BLOCKER_TEMPLATES.find((item) => item.id === templateId);
  const saving = fetcher.state !== "idle";
  const activeIntent = saving ? pendingIntent.current : "";
  const baselineDesign =
    saved.design || defaultBlockerDesign(knownTemplateId(saved.design?.templateId) || initialTemplate);
  const designDirty =
    Boolean(loadError) ||
    blockerDesignFingerprint(design) !== blockerDesignFingerprint(baselineDesign);
  const visibleSavedCountries = countriesFromCodes(saved.blockedCountries, countryCatalog);
  const countriesDirty = !sameList(
    countries.map((country) => country.code),
    visibleSavedCountries.map((country) => country.code),
  );
  const ipsDirty = !sameList(ips, saved.blockedIps);
  const rangesDirty = !sameList(ranges, saved.blockedIpRanges);
  const whitelistDirty = !sameList(whitelist, saved.whitelistedIps);
  const designChanged =
    blockerDesignFingerprint(design) !== blockerDesignFingerprint(defaultBlockerDesign(templateId));
  const unknownCountries = (saved.blockedCountries || []).filter(
    (code) => !indexCountryCatalog(countryCatalog).has(code),
  ).length;

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (handled.current === fetcher.data) return;
    handled.current = fetcher.data;
    const result = fetcher.data;
    const intent = pendingIntent.current;

    if (!result.ok) {
      const message = result.error || "The country blocker could not be saved.";
      // Keep errors next to the section — BFS 4.2.4 rejects auto-dismissing error toasts.
      setErrors((current) => ({ ...current, [intent]: message }));
      if (whitelistRollback.current) {
        setWhitelist(whitelistRollback.current);
        whitelistRollback.current = null;
      }
      return;
    }

    whitelistRollback.current = null;
    const next = result.blocker;
    const sent = submitted.current || {};
    setSaved(next);
    setLoadError("");
    setErrors((current) => ({ ...current, [intent]: "" }));
    if (intent === "design" && next.design) {
      setDesigns((current) => {
        const id = next.design.templateId;
        if (!current[id]) return current;
        if (blockerDesignFingerprint(current[id]) !== blockerDesignFingerprint(sent.design)) {
          return current;
        }
        return {
          ...current,
          [id]: {
            templateId: id,
            content: { ...next.design.content },
            style: { ...next.design.style },
          },
        };
      });
    } else if (intent === "countries") {
      setCountries((current) => {
        if (!sameList(current.map((country) => country.code), sent.countries)) return current;
        return countriesFromCodes(next.blockedCountries, countryCatalog);
      });
    } else if (intent === "ips") {
      setIps((current) => (sameList(current, sent.ips) ? next.blockedIps : current));
    } else if (intent === "ranges") {
      setRanges((current) => (sameList(current, sent.ranges) ? next.blockedIpRanges : current));
    } else if (intent === "whitelist") {
      setWhitelist((current) =>
        sameList(current, sent.whitelist) ? next.whitelistedIps : current,
      );
    }
    shopify.toast.show(SAVED_LABEL[intent] || "Country blocker saved");
  }, [countryCatalog, fetcher.state, fetcher.data, shopify]);

  const appearanceUnsaved =
    blockerDesignFingerprint(design) !== blockerDesignFingerprint(baselineDesign);

  useEffect(() => {
    if (!shopify?.saveBar) return;
    if (appearanceUnsaved) shopify.saveBar.show(BLOCKER_SAVE_BAR_ID);
    else shopify.saveBar.hide(BLOCKER_SAVE_BAR_ID);
  }, [appearanceUnsaved, shopify]);

  useEffect(() => {
    return () => {
      shopify?.saveBar?.hide?.(BLOCKER_SAVE_BAR_ID);
    };
  }, [shopify]);

  function submit(patch) {
    if (saving) return;
    pendingIntent.current = patch.intent;
    submitted.current = patch;
    setErrors((current) => ({ ...current, [patch.intent]: "" }));
    const formData = new FormData();
    formData.set("payload", JSON.stringify(patch));
    fetcher.submit(formData, { method: "POST" });
  }

  function updateDesign(group, key, value) {
    setDesigns((current) => ({
      ...current,
      [templateId]: {
        ...current[templateId],
        [group]: { ...current[templateId][group], [key]: value },
      },
    }));
    setErrors((current) => ({ ...current, design: "" }));
  }

  function resetDesign() {
    setDesigns((current) => ({
      ...current,
      [templateId]: defaultBlockerDesign(templateId),
    }));
    setErrors((current) => ({ ...current, design: "" }));
    shopify.toast.show(`${template.name} reset to its default look`);
  }

  function saveDesign() {
    if (!designDirty || saving) return;
    submit({ intent: "design", design });
  }

  function discardDesign() {
    if (saving) return;
    const restoredId =
      knownTemplateId(baselineDesign?.templateId) ||
      knownTemplateId(saved.design?.templateId) ||
      initialTemplate;
    const restored = baselineDesign?.templateId
      ? {
          templateId: restoredId,
          content: { ...baselineDesign.content },
          style: { ...baselineDesign.style },
        }
      : defaultBlockerDesign(restoredId);
    setTemplateId(restoredId);
    setDesigns((current) => ({
      ...current,
      [restoredId]: restored,
    }));
    setErrors((current) => ({ ...current, design: "" }));
  }

  function saveCountries() {
    if (!countriesDirty || saving) return;
    submit({
      intent: "countries",
      countries: countries.map((country) => country.code),
    });
  }

  function addToList(kind) {
    if (kind === "ips") {
      const error = ipv4Error(ipDraft);
      if (error) return setErrors((current) => ({ ...current, ips: error }));
      const next = canonicalIpv4(ipDraft);
      if (ips.includes(next)) {
        return setErrors((current) => ({ ...current, ips: `${next} is already in the list.` }));
      }
      setIps((current) => [...current, next]);
      setIpDraft("");
      setErrors((current) => ({ ...current, ips: "" }));
      return;
    }
    if (kind === "ranges") {
      const error = rangeEntryError(rangeDraft);
      if (error) return setErrors((current) => ({ ...current, ranges: error }));
      const next = canonicalRange(rangeDraft);
      if (ranges.includes(next)) {
        return setErrors((current) => ({ ...current, ranges: `${next} is already in the list.` }));
      }
      setRanges((current) => [...current, next]);
      setRangeDraft("");
      setErrors((current) => ({ ...current, ranges: "" }));
      return;
    }
    const error = ipv4Error(whitelistDraft);
    if (error) return setErrors((current) => ({ ...current, whitelist: error }));
    const next = canonicalIpv4(whitelistDraft);
    if (whitelist.includes(next)) {
      return setErrors((current) => ({
        ...current,
        whitelist: `${next} is already in the list.`,
      }));
    }
    setWhitelist((current) => [...current, next]);
    setWhitelistDraft("");
    setErrors((current) => ({ ...current, whitelist: "" }));
  }

  function saveIps() {
    const result = normalizeIpv4List(ips);
    if (!result.ok) return setErrors((current) => ({ ...current, ips: result.error }));
    submit({ intent: "ips", ips: result.list });
  }

  function saveRanges() {
    const result = normalizeRangeList(ranges);
    if (!result.ok) return setErrors((current) => ({ ...current, ranges: result.error }));
    submit({ intent: "ranges", ranges: result.list });
  }

  function saveWhitelist(next = whitelist) {
    const result = normalizeWhitelist(next);
    if (!result.ok) return setErrors((current) => ({ ...current, whitelist: result.error }));
    submit({ intent: "whitelist", whitelist: result.list });
  }

  function removeWhitelist(ip) {
    if (saving) return;
    const next = whitelist.filter((item) => item !== ip);
    setWhitelist(next);
    setErrors((current) => ({ ...current, whitelist: "" }));
    if (sameList(next, saved.whitelistedIps)) return;
    whitelistRollback.current = whitelist;
    saveWhitelist(next);
  }

  function openThemeEditor() {
    if (!editorUrl) {
      shopify.toast.show("The theme editor link isn't available for this store yet.");
      return;
    }
    const topWindow = window.top || window;
    topWindow.location.href = editorUrl;
  }

  let designNote = "Save publishes this design. Blocked visitors see only the design you save.";
  if (activeIntent === "design") designNote = "Saving this design to your shop.";
  else if (errors.design) designNote = errors.design;
  else if (loadError) designNote = loadError;
  else if (designDirty) designNote = "You have unsaved design changes.";
  else if (saved.design && saved.design.templateId === templateId) {
    designNote = "Saved. Blocked visitors see this design.";
  }

  return (
    <s-page id="ece-blocker" heading="Country Blocker" inlineSize="large">
      <s-link slot="breadcrumb-actions" href="/app">
        Dashboard
      </s-link>
      <ui-save-bar id={BLOCKER_SAVE_BAR_ID}>
        <button
          id="ece-blocker-save-bar-save"
          variant="primary"
          disabled={!appearanceUnsaved || saving}
          onClick={saveDesign}
        >
          Save
        </button>
        <button
          id="ece-blocker-save-bar-discard"
          disabled={saving}
          onClick={discardDesign}
        >
          Discard
        </button>
      </ui-save-bar>
      <div className="ece-blocker">
        <style dangerouslySetInnerHTML={{ __html: blockerCss }} />

        <div className="ece-blocker__phone-note" role="note">
          The design preview is clearest on a computer. You can still edit the lists here.
        </div>

        <section className="ece-blocker__embed" aria-label="Theme embed">
          <div>
            <span className={`ece-blocker__status${embedActive ? " is-active" : ""}`}>
              <span className="ece-blocker__dot" aria-hidden="true" />
              {embedActive ? "Active on your theme" : "Not active on your theme"}
            </span>
            <p>
              Turn on the Country Blocker embed. Visitors are blocked only while it is enabled.
              An allowed IP can still browse, even from a blocked country. If the location lookup
              fails, the visitor is not blocked.
            </p>
            {embedError ? (
              <p className="ece-blocker__error" role="alert">
                {embedError}
              </p>
            ) : null}
          </div>
          <s-button id="ece-blocker-theme-editor" variant="secondary" onClick={openThemeEditor}>
            {embedActive ? "Configure embed" : "Turn on embed"}
          </s-button>
        </section>

        <section className="ece-blocker__card" aria-labelledby="ece-blocker-design-title">
          <div className="ece-blocker__card-head">
            <div>
              <h2 id="ece-blocker-design-title">Appearance</h2>
              <p className={errors.design || loadError ? "is-critical" : ""}>{designNote}</p>
            </div>
            <div className="ece-blocker__actions">
              <s-button
                id="ece-blocker-reset-design"
                variant="secondary"
                disabled={!designChanged || saving}
                onClick={resetDesign}
              >
                Reset design
              </s-button>
              <s-button
                id="ece-blocker-save-design"
                variant="primary"
                disabled={!designDirty || saving}
                loading={activeIntent === "design"}
                onClick={saveDesign}
              >
                Save design
              </s-button>
            </div>
          </div>

          <div className="ece-blocker__templates" aria-label="Country blocker designs">
            {ECE_BLOCKER_TEMPLATES.map((item) => {
              const selected = item.id === templateId;
              return (
                <button
                  key={item.id}
                  type="button"
                  id={`ece-blocker-template-${item.id}`}
                  className={`ece-blocker__template${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setTemplateId(item.id)}
                >
                  <DesignThumb templateId={item.id} style={designs[item.id].style} />
                  <span className="ece-blocker__template-copy">
                    <span className="ece-blocker__template-name">{item.name}</span>
                    <span>{item.summary}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="ece-blocker__workspace">
            <div className="ece-blocker__settings">
              <label className="ece-blocker__field" htmlFor="ece-blocker-heading">
                <span>Heading</span>
                <input
                  id="ece-blocker-heading"
                  value={design.content.heading}
                  maxLength={300}
                  onChange={(event) => updateDesign("content", "heading", fieldValue(event))}
                />
              </label>
              <label className="ece-blocker__field" htmlFor="ece-blocker-message">
                <span>Message</span>
                <textarea
                  id="ece-blocker-message"
                  rows={4}
                  value={design.content.message}
                  maxLength={2000}
                  onChange={(event) => updateDesign("content", "message", fieldValue(event))}
                />
              </label>
              <RangeControl
                id="ece-blocker-heading-size"
                label="Heading size"
                value={design.style.headingSize}
                min={ECE_BLOCKER_HEADING_MIN}
                max={ECE_BLOCKER_HEADING_MAX}
                suffix="px"
                onChange={(value) => updateDesign("style", "headingSize", value)}
              />
              <RangeControl
                id="ece-blocker-max-width"
                label="Panel width"
                value={design.style.maxWidth}
                min={ECE_BLOCKER_WIDTH_MIN}
                max={ECE_BLOCKER_WIDTH_MAX}
                suffix="px"
                onChange={(value) => updateDesign("style", "maxWidth", value)}
              />
              <div className="ece-blocker__colors">
                {COLOR_FIELDS.map((field) => (
                  <label key={field.key} className="ece-blocker__color" htmlFor={`ece-blocker-color-${field.key}`}>
                    <span className="ece-blocker__swatch" style={{ background: design.style[field.key] }}>
                      <input
                        id={`ece-blocker-color-${field.key}`}
                        type="color"
                        value={design.style[field.key]}
                        onChange={(event) => updateDesign("style", field.key, event.target.value)}
                      />
                    </span>
                    <span>{field.label}</span>
                    <span className="ece-blocker__hex">{design.style[field.key].toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="ece-blocker__stage" data-design={templateId} style={previewVars(design)} aria-label="Blocked visitor preview">
              <div className="ece-blocker__store" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="ece-blocker__overlay">
                <div className="ece-blocker__panel">
                  <p className="ece-blocker__kicker">
                    {templateId === "ece-blocker-futuristic" ? "Restricted" : "Unavailable"}
                  </p>
                  <p className="ece-blocker__preview-heading">{design.content.heading || "Heading"}</p>
                  <p className="ece-blocker__preview-message">{design.content.message || "Message"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ece-blocker__card" aria-labelledby="ece-blocker-countries-title">
          <div className="ece-blocker__card-head">
            <div>
              <h2 id="ece-blocker-countries-title">Blocked countries</h2>
              <p>Visitors from these countries see the overlay. Each save replaces this list.</p>
            </div>
            <s-button
              id="ece-blocker-save-countries"
              variant="primary"
              disabled={!countriesDirty || saving}
              loading={activeIntent === "countries"}
              onClick={saveCountries}
            >
              Save countries
            </s-button>
          </div>
          {unknownCountries > 0 ? (
            <p className="ece-blocker__hint">
              {unknownCountries === 1
                ? "1 saved country isn't in the country list. The next country save will drop it."
                : `${unknownCountries} saved countries aren't in the country list. The next country save will drop them.`}
            </p>
          ) : null}
          {errors.countries ? (
            <p className="ece-blocker__error" role="alert">{errors.countries}</p>
          ) : null}
          {countries.length > 0 ? (
            <div className="ece-blocker__chips">
              {countries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  className="ece-blocker__chip"
                  onClick={() =>
                    setCountries((current) => current.filter((item) => item.code !== country.code))
                  }
                >
                  {country.name}
                  <span aria-hidden="true">×</span>
                  <span className="ece-blocker__sr">Remove {country.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="ece-blocker__empty">No countries are blocked.</p>
          )}
          <EceCountryPicker
            idPrefix="ece-blocker"
            groups={groups}
            taken={OPEN_TAKEN}
            selected={countries}
            onChange={setCountries}
            footNote="Search by country or continent. A checked continent selects the countries you can see."
            emptyNote="No countries are available."
          />
        </section>

        <AddressList
          id="ece-blocker-ips"
          title="Blocked IP addresses"
          lede="One IPv4 address per row. Each number must be from 0 to 255."
          placeholder="203.0.113.10"
          draft={ipDraft}
          onDraft={setIpDraft}
          items={ips}
          error={errors.ips}
          dirty={ipsDirty}
          saving={saving}
          loading={activeIntent === "ips"}
          saveLabel="Save IPs"
          onAdd={() => addToList("ips")}
          onRemove={(ip) => setIps((current) => current.filter((item) => item !== ip))}
          onSave={saveIps}
        />

        <AddressList
          id="ece-blocker-ranges"
          title="Blocked IP ranges"
          lede="Use 203.0.113.1-203.0.113.20 or a network such as 203.0.113.0/24. The mask must be from 0 to 32."
          placeholder="203.0.113.0/24"
          draft={rangeDraft}
          onDraft={setRangeDraft}
          items={ranges}
          error={errors.ranges}
          dirty={rangesDirty}
          saving={saving}
          loading={activeIntent === "ranges"}
          saveLabel="Save ranges"
          onAdd={() => addToList("ranges")}
          onRemove={(range) => setRanges((current) => current.filter((item) => item !== range))}
          onSave={saveRanges}
        />

        <AddressList
          id="ece-blocker-whitelist"
          title="Allowed IP addresses"
          lede="These addresses can browse the store even when their country, IP, or range is blocked. Removing one saves immediately. This is the same allow-list the redirect embeds use."
          placeholder="203.0.113.10"
          draft={whitelistDraft}
          onDraft={setWhitelistDraft}
          items={whitelist}
          error={errors.whitelist}
          dirty={whitelistDirty}
          saving={saving}
          loading={activeIntent === "whitelist"}
          saveLabel="Save allowed IPs"
          onAdd={() => addToList("whitelist")}
          onRemove={removeWhitelist}
          onSave={() => saveWhitelist()}
        />
      </div>
    </s-page>
  );
}

function AddressList({
  id,
  title,
  lede,
  placeholder,
  draft,
  onDraft,
  items,
  error,
  dirty,
  saving,
  loading,
  saveLabel,
  onAdd,
  onRemove,
  onSave,
}) {
  return (
    <section className="ece-blocker__card" aria-labelledby={`${id}-title`}>
      <div className="ece-blocker__card-head">
        <div>
          <h2 id={`${id}-title`}>{title}</h2>
          <p>{lede}</p>
        </div>
        <s-button
          id={`${id}-save`}
          variant="primary"
          disabled={!dirty || saving}
          loading={loading}
          onClick={onSave}
        >
          {saveLabel}
        </s-button>
      </div>
      {error ? (
        <p className="ece-blocker__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
      <div className="ece-blocker__add">
        <label className="ece-blocker__field" htmlFor={`${id}-input`}>
          <span className="ece-blocker__sr">Add an address</span>
          <input
            id={`${id}-input`}
            value={draft}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck="false"
            onChange={(event) => onDraft(fieldValue(event))}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              onAdd();
            }}
          />
        </label>
        <s-button id={`${id}-add`} variant="secondary" disabled={saving} onClick={onAdd}>
          Add
        </s-button>
      </div>
      {items.length === 0 ? (
        <p className="ece-blocker__empty">Nothing saved in this list yet.</p>
      ) : (
        <ul className="ece-blocker__rows">
          {items.map((item) => (
            <li key={item} className="ece-blocker__row">
              <code>{item}</code>
              <button type="button" className="ece-blocker__remove" onClick={() => onRemove(item)} disabled={saving}>
                Remove
                <span className="ece-blocker__sr"> {item}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RangeControl({ id, label, value, min, max, suffix, onChange }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="ece-blocker__range">
      <div className="ece-blocker__range-head">
        <label htmlFor={id}>{label}</label>
        <span>
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        style={{ "--fill": `${fill}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function DesignThumb({ templateId, style }) {
  return (
    <span
      className={`ece-blocker__thumb is-${templateId}`}
      style={{
        "--thumb-bg": style.background,
        "--thumb-overlay": style.overlay,
        "--thumb-accent": style.accent,
        "--thumb-text": style.text,
      }}
      aria-hidden="true"
    >
      <span />
    </span>
  );
}

function previewVars(design) {
  return {
    "--ece-b-bg": design.style.background,
    "--ece-b-overlay": design.style.overlay,
    "--ece-b-text": design.style.text,
    "--ece-b-accent": design.style.accent,
    "--ece-b-heading": `${design.style.headingSize}px`,
    "--ece-b-width": `${Math.min(design.style.maxWidth, 440)}px`,
  };
}
