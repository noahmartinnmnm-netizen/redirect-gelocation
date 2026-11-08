/* eslint-disable react/prop-types */
import { useState } from "react";
import { EceCountryPicker } from "./EceCountryPicker";
import { popupTemplate } from "./EcePopupTemplates";
import { destinationHost } from "./eceRuleModel";
import ruleCss from "./eceRuleModal.css?inline";

const CHIP_PREVIEW_COUNT = 10;

export function EceAddRuleModal({
  modalRef,
  draft,
  setDraft,
  groups,
  taken,
  pickerKey,
  saving,
  onSave,
  onBrowseTemplates,
}) {
  const template = popupTemplate(draft.popupTemplateId);
  return (
    <s-modal
      id="ece-add-rule-modal"
      ref={modalRef}
      heading="New redirect rule"
      size="large"
      accessibilityLabel="Add rule"
    >
      <EceRuleFields
        idPrefix="ece-add"
        draft={draft}
        setDraft={setDraft}
        groups={groups}
        taken={taken}
        pickerKey={pickerKey}
        saving={saving}
        popupStep={
          <EcePopupField
            idPrefix="ece-add"
            template={template}
            saving={saving}
            onBrowse={onBrowseTemplates}
            onClear={() => setDraft((current) => ({ ...current, popupTemplateId: "" }))}
          />
        }
      />
      <s-button
        id="ece-add-rule-save"
        slot="primary-action"
        variant="primary"
        loading={saving}
        onClick={onSave}
      >
        Create rule
      </s-button>
      <s-button
        id="ece-add-rule-cancel"
        slot="secondary-actions"
        variant="secondary"
        disabled={saving}
        commandFor="ece-add-rule-modal"
        command="--hide"
      >
        Cancel
      </s-button>
    </s-modal>
  );
}

export function EceEditRuleModal({
  modalRef,
  draft,
  setDraft,
  groups,
  taken,
  pickerKey,
  saving,
  onSave,
}) {
  return (
    <s-modal
      id="ece-edit-rule-modal"
      ref={modalRef}
      heading="Edit rule"
      size="large"
      accessibilityLabel="Edit rule"
    >
      <EceRuleFields
        idPrefix="ece-edit"
        draft={draft}
        setDraft={setDraft}
        groups={groups}
        taken={taken}
        pickerKey={pickerKey}
        saving={saving}
        emptyCountriesWarning="With no countries, this rule stops redirecting anyone."
      />
      <s-button
        id="ece-edit-rule-save"
        slot="primary-action"
        variant="primary"
        loading={saving}
        onClick={onSave}
      >
        Save changes
      </s-button>
      <s-button
        id="ece-edit-rule-cancel"
        slot="secondary-actions"
        variant="secondary"
        disabled={saving}
        commandFor="ece-edit-rule-modal"
        command="--hide"
      >
        Cancel
      </s-button>
    </s-modal>
  );
}

function EcePopupField({ idPrefix, template, saving, onBrowse, onClear }) {
  return (
    <div
      id={`${idPrefix}-popup`}
      className="ece-rule__options"
      role="radiogroup"
      aria-label="Redirect behaviour"
    >
      <button
        type="button"
        role="radio"
        aria-checked={Boolean(template)}
        id={template ? `${idPrefix}-popup-change` : `${idPrefix}-popup-browse`}
        className={`ece-rule__option${template ? " is-selected" : ""}`}
        disabled={saving}
        onClick={onBrowse}
      >
        <span className="ece-rule__radio" aria-hidden="true" />
        <span className="ece-rule__option-text">
          <span className="ece-rule__option-title">
            Ask with a popup
            {template ? (
              <span
                className={`ece-rule__pill${template.kind === "selector" ? " is-success" : ""}`}
              >
                {template.kindLabel}
              </span>
            ) : null}
          </span>
          <span className="ece-rule__option-desc" id={`${idPrefix}-popup-name`}>
            {template
              ? `${template.name} · Click to change template`
              : "Let visitors confirm or pick their store first."}
          </span>
        </span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={!template}
        id={`${idPrefix}-popup-none`}
        className={`ece-rule__option${template ? "" : " is-selected"}`}
        disabled={saving}
        onClick={() => {
          if (template) onClear();
        }}
      >
        <span className="ece-rule__radio" aria-hidden="true" />
        <span className="ece-rule__option-text">
          <span className="ece-rule__option-title">Redirect instantly</span>
          <span className="ece-rule__option-desc">
            Visitors land on the destination right away.
          </span>
        </span>
      </button>
    </div>
  );
}

function inputValue(event) {
  const target = event.currentTarget || event.target;
  return target?.value ?? "";
}

function EceRuleStep({ number, title, hint, done, children }) {
  return (
    <section className={`ece-rule__step${done ? " is-done" : ""}`}>
      <div className="ece-rule__marker" aria-hidden="true">
        {done ? <CheckIcon /> : number}
      </div>
      <div className="ece-rule__body">
        <div className="ece-rule__head">
          <h3 className="ece-rule__title">{title}</h3>
        </div>
        {hint ? <p className="ece-rule__hint">{hint}</p> : null}
        <div className="ece-rule__content">{children}</div>
      </div>
    </section>
  );
}

function EceRuleFields({
  idPrefix,
  draft,
  setDraft,
  groups,
  taken,
  pickerKey,
  saving,
  popupStep,
  emptyCountriesWarning,
}) {
  const [showAllChips, setShowAllChips] = useState(false);
  const countries = draft.countries;
  const hiddenChips = countries.length - CHIP_PREVIEW_COUNT;
  const visibleChips =
    showAllChips || hiddenChips <= 0 ? countries : countries.slice(0, CHIP_PREVIEW_COUNT);
  const urlReady = Boolean(destinationHost(draft.url));

  function setCountries(next) {
    setDraft((current) => ({
      ...current,
      countries: next,
      countryError: "",
      formError: "",
    }));
  }

  return (
    <div className="ece-rule">
      <style dangerouslySetInnerHTML={{ __html: ruleCss }} />
      {draft.formError ? (
        <div className="ece-rule__banner">
          <s-banner id={`${idPrefix}-form-error`} tone="critical" heading="Rule not saved">
            {draft.formError}
          </s-banner>
        </div>
      ) : null}

      <div className="ece-rule__name">
        <s-text-field
          id={`${idPrefix}-rule-name`}
          label="Rule name"
          name={`${idPrefix}-rule-name`}
          placeholder="e.g. Europe visitors"
          value={draft.name}
          required
          disabled={saving}
          {...(draft.nameError ? { error: draft.nameError } : {})}
          onInput={(event) => {
            const name = inputValue(event);
            setDraft((current) => ({
              ...current,
              name,
              nameError: "",
              formError: "",
            }));
          }}
        />
      </div>

      <div className="ece-rule__steps">
        <EceRuleStep
          number={1}
          title="Who should be redirected?"
          hint="Visitors browsing from these countries."
          done={countries.length > 0}
        >
          {countries.length > 0 ? (
            <div className="ece-rule__chips-wrap">
              <div id={`${idPrefix}-selected-countries`} className="ece-rule__chips">
                {visibleChips.map((country) => (
                  <s-chip
                    key={country.code}
                    id={`${idPrefix}-selected-${country.code}`}
                    removable
                    accessibilityLabel={`Remove ${country.name}`}
                    onRemove={() => {
                      if (saving) return;
                      setCountries(countries.filter((item) => item.code !== country.code));
                    }}
                  >
                    {country.name}
                  </s-chip>
                ))}
              </div>
              <div className="ece-rule__chip-actions">
                {hiddenChips > 0 ? (
                  <button
                    type="button"
                    className="ece-rule__link"
                    onClick={() => setShowAllChips((current) => !current)}
                  >
                    {showAllChips ? "Show less" : `Show ${hiddenChips} more`}
                  </button>
                ) : null}
                <button
                  type="button"
                  id={`${idPrefix}-clear-countries`}
                  className="ece-rule__link is-muted"
                  disabled={saving}
                  onClick={() => setCountries([])}
                >
                  Clear all
                </button>
              </div>
            </div>
          ) : emptyCountriesWarning ? (
            <p id={`${idPrefix}-no-countries`} className="ece-rule__warning">
              {emptyCountriesWarning}
            </p>
          ) : null}
          {draft.countryError ? (
            <p id={`${idPrefix}-country-error`} className="ece-rule__error">
              {draft.countryError}
            </p>
          ) : null}
          <EceCountryPicker
            key={pickerKey}
            idPrefix={idPrefix}
            groups={groups}
            taken={taken}
            selected={countries}
            disabled={saving}
            error=""
            onChange={setCountries}
          />
        </EceRuleStep>

        <EceRuleStep
          number={2}
          title="Where should they go?"
          hint="The store or page these visitors should land on."
          done={urlReady}
        >
          <s-text-field
            id={`${idPrefix}-rule-url`}
            label="Destination URL"
            labelAccessibilityVisibility="exclusive"
            name={`${idPrefix}-rule-url`}
            placeholder="https://eu.yourstore.com"
            value={draft.url}
            required
            disabled={saving}
            {...(draft.urlError ? { error: draft.urlError } : {})}
            onInput={(event) => {
              const url = inputValue(event);
              setDraft((current) => ({
                ...current,
                url,
                urlError: "",
                formError: "",
              }));
            }}
            onChange={(event) => {
              const url = inputValue(event).trim();
              if (!url || /^https?:\/\//i.test(url) || !url.includes(".")) return;
              setDraft((current) => ({ ...current, url: `https://${url}` }));
            }}
          />
        </EceRuleStep>

        {popupStep ? (
          <EceRuleStep
            number={3}
            title="How should they be redirected?"
            done
          >
            {popupStep}
          </EceRuleStep>
        ) : null}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M5 10.5l3.2 3L15 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

