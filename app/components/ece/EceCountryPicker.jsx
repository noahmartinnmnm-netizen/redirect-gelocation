/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { visibleCatalogCountries } from "./eceRuleModel";

function continentSlug(continent) {
  return continent.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function EceCountryPicker({
  idPrefix = "ece",
  groups,
  taken,
  selected,
  onChange,
  error,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState({});
  const normalizedQuery = query.trim().toLowerCase();
  const selectedCodes = new Set(selected.map((country) => country.code));

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      const root = document.getElementById(`${idPrefix}-country-picker`);
      if (!root || root.contains(event.target)) return;
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [idPrefix, open]);

  function toggleCountry(country, checked) {
    if (checked) {
      onChange([...selected, country]);
      return;
    }
    onChange(selected.filter((item) => item.code !== country.code));
  }

  function toggleContinent(visible, checked) {
    const visibleCodes = new Set(visible.map((country) => country.code));
    const kept = selected.filter((country) => !visibleCodes.has(country.code));
    onChange(checked ? [...kept, ...visible] : kept);
  }

  const summary = open
    ? "Close list"
    : selected.length === 0
      ? "Choose countries"
      : "Add or remove countries";

  return (
    <div id={`${idPrefix}-country-picker`} className="ece-picker-root">
      <div className="ece-picker-toggle">
        <s-button
          id={`${idPrefix}-country-picker-toggle`}
          variant="secondary"
          icon={open ? "chevron-up" : "plus"}
          accessibilityLabel={open ? "Close country list" : "Open country list"}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
        >
          {summary}
        </s-button>
        {selected.length > 0 ? (
          <span className="ece-picker-count">
            {selected.length} {selected.length === 1 ? "country" : "countries"} selected
          </span>
        ) : null}
      </div>
      {error ? <s-text tone="critical">{error}</s-text> : null}
      {open ? (
        <div id={`${idPrefix}-country-picker-panel`} className="ece-picker">
          <div className="ece-picker__search">
            <s-search-field
              id={`${idPrefix}-country-search`}
              label="Search countries"
              labelAccessibilityVisibility="exclusive"
              name={`${idPrefix}-country-search`}
              placeholder="Search a country or continent"
              value={query}
              onInput={(event) => setQuery(event.currentTarget.value ?? "")}
            />
          </div>
          <div className="ece-picker__list">
            {groups.map((group) => {
              const visible = visibleCatalogCountries(
                group,
                normalizedQuery,
                taken,
              );
              if (visible.length === 0) return null;
              const selectedCount = visible.filter((country) =>
                selectedCodes.has(country.code),
              ).length;
              const allSelected = selectedCount === visible.length;
              const someSelected = selectedCount > 0 && !allSelected;
              const forceOpen = normalizedQuery.length > 0;
              const isOpen = forceOpen || expanded[group.continent];
              const slug = continentSlug(group.continent);
              const continentCheck = (
                <s-checkbox
                  id={`${idPrefix}-continent-check-${slug}`}
                  label={group.continent}
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(event) =>
                    toggleContinent(visible, event.currentTarget.checked)
                  }
                />
              );

              return (
                <div
                  key={group.continent}
                  id={`${idPrefix}-continent-${slug}`}
                  className={`ece-picker__group${isOpen ? " is-open" : ""}`}
                >
                  <div className="ece-picker__row">
                    {forceOpen ? (
                      <span className="ece-picker__chev-space" />
                    ) : (
                      <button
                        type="button"
                        id={`${idPrefix}-continent-toggle-${slug}`}
                        className="ece-picker__chev"
                        aria-expanded={Boolean(isOpen)}
                        aria-label={
                          isOpen
                            ? `Collapse ${group.continent}`
                            : `Expand ${group.continent}`
                        }
                        onClick={() =>
                          setExpanded((current) => ({
                            ...current,
                            [group.continent]: !current[group.continent],
                          }))
                        }
                      >
                        <ChevronIcon />
                      </button>
                    )}
                    {continentCheck}
                    <span
                      className={`ece-picker__badge${selectedCount > 0 ? " is-active" : ""}`}
                    >
                      {selectedCount > 0
                        ? `${selectedCount} of ${visible.length}`
                        : visible.length}
                    </span>
                  </div>
                  {isOpen ? (
                    <div className="ece-country-list" id={`${idPrefix}-countries-${slug}`}>
                      {visible.map((country) => (
                        <s-checkbox
                          key={country.code}
                          id={`${idPrefix}-country-${country.code}`}
                          label={country.name}
                          checked={selectedCodes.has(country.code)}
                          onChange={(event) =>
                            toggleCountry(country, event.currentTarget.checked)
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {groups.every(
              (group) =>
                visibleCatalogCountries(group, normalizedQuery, taken).length ===
                0,
            ) ? (
              <p id={`${idPrefix}-country-picker-empty`} className="ece-picker__empty">
                {normalizedQuery
                  ? "No countries match that search."
                  : "Every country is already covered by another rule."}
              </p>
            ) : null}
          </div>
          <div className="ece-picker__foot">
            <span>Countries already used by another rule aren&apos;t listed.</span>
            <s-button
              id={`${idPrefix}-country-picker-done`}
              variant="primary"
              onClick={() => setOpen(false)}
            >
              Done
            </s-button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M7.5 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
