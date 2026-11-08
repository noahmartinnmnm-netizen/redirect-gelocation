/* eslint-disable react/prop-types */
import { useState } from "react";
import {
  ECE_PREVIEW_COUNTRIES,
  buttonLabel,
  currencyLabel,
  flagImageUrl,
  hexToRgba,
  popupWidthRem,
  previewCountry,
  tokenParts,
} from "./ecePopupDesigns";

export function EcePopupPreview({
  design,
  device,
  country,
  languageCode,
  notice,
  onCountryChange,
  onLanguageChange,
  onClose,
  onConfirm,
  onStay,
  onReplay,
}) {
  const style = design.style;
  const vars = {
    "--pp-width": `${popupWidthRem(style.width)}rem`,
    "--pp-radius": `${style.radius}px`,
    "--pp-heading-size": `${style.headingSize}px`,
    "--pp-bg": style.glass ? hexToRgba(style.background, 0.74) : style.background,
    "--pp-accent": style.accent,
    "--pp-accent-soft": hexToRgba(style.accent, 0.12),
    "--pp-accent-ring": hexToRgba(style.accent, 0.22),
    "--pp-heading": style.headingColor,
    "--pp-message": style.messageColor,
    "--pp-primary-bg": style.primaryBackground,
    "--pp-primary-text": style.primaryText,
    "--pp-secondary-bg": style.secondaryBackground,
    "--pp-secondary-text": style.secondaryText,
    "--pp-dropdown-bg": style.dropdownBackground,
    "--pp-dropdown-text": style.dropdownText,
    "--pp-backdrop": `rgba(15, 23, 42, ${style.backdrop / 100})`,
  };

  return (
    <div className={`ece-pp-device is-${device}`}>
      <div className="ece-pp-browser">
        <span className="ece-pp-browser__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="ece-pp-browser__url">
          <PreviewIcon name="lock" />
          your-store.com/products/linen-shirt
        </span>
      </div>

      <div className="ece-pp-stage" style={vars}>
        <MockStorefront device={device} />

        {notice ? (
          <PreviewNotice notice={notice} onReplay={onReplay} />
        ) : (
          <div className="ece-pp-overlay">
            {design.templateId === "ece-selector-passport" ? (
              <PassportPopup
                design={design}
                country={country}
                languageCode={languageCode}
                onCountryChange={onCountryChange}
                onLanguageChange={onLanguageChange}
                onClose={onClose}
                onConfirm={onConfirm}
                onStay={onStay}
              />
            ) : (
              <SpotlightPopup
                design={design}
                country={country}
                onClose={onClose}
                onConfirm={onConfirm}
                onStay={onStay}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SpotlightPopup({ design, country, onClose, onConfirm, onStay }) {
  const { content, preferences, style } = design;
  const primary = buttonLabel(content.primaryButton, country.name, preferences.uppercaseCountry);
  const secondary = buttonLabel(
    content.secondaryButton,
    country.name,
    preferences.uppercaseCountry,
  );

  return (
    <div
      className={`ece-pp-popup ece-pp-spotlight${style.glass ? " is-glass" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Store suggestion"
    >
      {preferences.closeButton ? <CloseButton onClick={onClose} /> : null}
      <div className="ece-pp-spotlight__glow" aria-hidden="true" />
      <div className="ece-pp-spotlight__badge">
        <Flag code={country.code} size="large" />
        <span className="ece-pp-spotlight__pin" aria-hidden="true">
          <PreviewIcon name="pin" />
        </span>
      </div>
      <h3 className="ece-pp-heading">
        <TokenText text={content.heading} country={country} />
      </h3>
      {content.message ? (
        <p className="ece-pp-message">
          <TokenText text={content.message} country={country} />
        </p>
      ) : null}
      <div className="ece-pp-actions">
        {primary ? (
          <button type="button" className="ece-pp-btn is-primary" onClick={onConfirm}>
            {primary}
            <PreviewIcon name="arrow" />
          </button>
        ) : null}
        {secondary ? (
          <button type="button" className="ece-pp-btn is-secondary" onClick={onStay}>
            {secondary}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PassportPopup({
  design,
  country,
  languageCode,
  onCountryChange,
  onLanguageChange,
  onClose,
  onConfirm,
  onStay,
}) {
  const { content, preferences, style } = design;
  const primary = buttonLabel(content.primaryButton, country.name, preferences.uppercaseCountry);
  const secondary = buttonLabel(
    content.secondaryButton,
    country.name,
    preferences.uppercaseCountry,
  );
  const language =
    country.languages.find((item) => item.code === languageCode) || country.languages[0];

  return (
    <div
      className={`ece-pp-popup ece-pp-passport${style.glass ? " is-glass" : ""}${
        preferences.headerImage ? " has-header" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Choose your region"
    >
      {preferences.closeButton ? (
        <CloseButton onClick={onClose} onImage={preferences.headerImage} />
      ) : null}

      {preferences.headerImage ? (
        <div className="ece-pp-passport__header">
          {preferences.headerImageUrl ? (
            <HeaderImage url={preferences.headerImageUrl} />
          ) : (
            <HeaderArt />
          )}
          <span className="ece-pp-passport__flag">
            <Flag code={country.code} size="large" />
          </span>
        </div>
      ) : null}

      <div className="ece-pp-passport__body">
        <h3 className="ece-pp-heading">
          <TokenText text={content.heading} country={country} />
        </h3>
        {content.message ? (
          <p className="ece-pp-message">
            <TokenText text={content.message} country={country} />
          </p>
        ) : null}

        <div className="ece-pp-fields">
          <label className="ece-pp-field">
            <span className="ece-pp-field__label">Country / region</span>
            <span className="ece-pp-select">
              <Flag code={country.code} />
              <select
                value={country.code}
                onChange={(event) => onCountryChange(event.target.value)}
              >
                {ECE_PREVIEW_COUNTRIES.map((item) => {
                  const money = currencyLabel(item.currency, preferences);
                  return (
                    <option key={item.code} value={item.code}>
                      {money ? `${item.name} (${money})` : item.name}
                    </option>
                  );
                })}
              </select>
              <PreviewIcon name="chevron" />
            </span>
          </label>

          {preferences.showLanguages ? (
            <label className="ece-pp-field">
              <span className="ece-pp-field__label">Language</span>
              <span className="ece-pp-select">
                <span className="ece-pp-select__icon">
                  <PreviewIcon name="translate" />
                </span>
                <select
                  value={language.code}
                  onChange={(event) => onLanguageChange(event.target.value)}
                >
                  {country.languages.map((item) => (
                    <option key={item.code} value={item.code}>
                      {preferences.showLanguageName ? item.name : item.code.toUpperCase()}
                    </option>
                  ))}
                </select>
                <PreviewIcon name="chevron" />
              </span>
            </label>
          ) : null}
        </div>

        <div className="ece-pp-actions">
          {primary ? (
            <button type="button" className="ece-pp-btn is-primary" onClick={onConfirm}>
              {primary}
            </button>
          ) : null}
          {secondary ? (
            <button type="button" className="ece-pp-btn is-link" onClick={onStay}>
              {secondary}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TokenText({ text, country }) {
  return tokenParts(text).map((part, index) => {
    if (part.type === "flagCountry") {
      return (
        <span key={index} className="ece-pp-token">
          <Flag code={country.code} />
          {country.name}
        </span>
      );
    }
    if (part.type === "flag") return <Flag key={index} code={country.code} />;
    if (part.type === "country") {
      return (
        <span key={index} className="ece-pp-token is-name">
          {country.name}
        </span>
      );
    }
    return <span key={index}>{part.value}</span>;
  });
}

function Flag({ code, size = "small" }) {
  const [failed, setFailed] = useState("");

  if (failed === code) {
    return <span className={`ece-pp-flag is-${size} is-fallback`}>{code}</span>;
  }

  return (
    <img
      className={`ece-pp-flag is-${size}`}
      src={flagImageUrl(code)}
      alt=""
      loading="lazy"
      onError={() => setFailed(code)}
    />
  );
}

function HeaderImage({ url }) {
  const [failedUrl, setFailedUrl] = useState("");
  const src = url.startsWith("//") ? `https:${url}` : url;

  if (failedUrl === src) return <HeaderArt />;
  return (
    <img
      className="ece-pp-passport__image"
      src={src}
      alt=""
      onError={() => setFailedUrl(src)}
    />
  );
}

function HeaderArt() {
  return (
    <svg
      className="ece-pp-passport__art"
      viewBox="0 0 400 140"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <circle cx="320" cy="150" r="120" fill="none" stroke="currentColor" strokeOpacity="0.22" />
      <ellipse cx="320" cy="150" rx="50" ry="120" fill="none" stroke="currentColor" strokeOpacity="0.18" />
      <ellipse cx="320" cy="150" rx="95" ry="120" fill="none" stroke="currentColor" strokeOpacity="0.14" />
      <path d="M200 110h240M210 70h220M240 35h160" stroke="currentColor" strokeOpacity="0.16" />
      <circle cx="60" cy="-10" r="90" fill="currentColor" fillOpacity="0.07" />
      <circle cx="140" cy="40" r="3" fill="currentColor" fillOpacity="0.5" />
      <circle cx="230" cy="62" r="3" fill="currentColor" fillOpacity="0.5" />
      <path
        d="M140 40 Q185 15 230 62"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeDasharray="3 5"
      />
    </svg>
  );
}

function CloseButton({ onClick, onImage = false }) {
  return (
    <button
      type="button"
      className={`ece-pp-close${onImage ? " is-on-image" : ""}`}
      aria-label="Close popup"
      onClick={onClick}
    >
      <PreviewIcon name="close" />
    </button>
  );
}

function PreviewNotice({ notice, onReplay }) {
  return (
    <div className="ece-pp-notice-layer">
      <div className={`ece-pp-notice is-${notice.tone}`} role="status">
        <span className="ece-pp-notice__icon">
          <PreviewIcon name={notice.icon} />
        </span>
        <div>
          <p className="ece-pp-notice__title">{notice.title}</p>
          <p className="ece-pp-notice__body">{notice.body}</p>
        </div>
        <button type="button" className="ece-pp-notice__replay" onClick={onReplay}>
          <PreviewIcon name="replay" />
          Show popup again
        </button>
      </div>
    </div>
  );
}

function MockStorefront({ device }) {
  const products = device === "mobile" ? 2 : 4;
  return (
    <div className="ece-pp-store" aria-hidden="true">
      <div className="ece-pp-store__announce">Free shipping on orders over $75</div>
      <div className="ece-pp-store__nav">
        <span className="ece-pp-store__logo">Northwind</span>
        {device === "desktop" ? (
          <span className="ece-pp-store__links">
            <span>Shop</span>
            <span>New in</span>
            <span>About</span>
          </span>
        ) : null}
        <span className="ece-pp-store__icons">
          <span />
          <span />
        </span>
      </div>
      <div className="ece-pp-store__hero">
        <span className="ece-pp-store__line is-wide" />
        <span className="ece-pp-store__line" />
        <span className="ece-pp-store__cta" />
      </div>
      <div className={`ece-pp-store__grid is-${products}`}>
        {Array.from({ length: products }, (_, index) => (
          <span key={index} className="ece-pp-store__card">
            <span className="ece-pp-store__thumb" />
            <span className="ece-pp-store__line is-short" />
            <span className="ece-pp-store__line is-price" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function previewNotice({ design, scenario, outcome, country, storeCountry }) {
  const minutes = design.preferences.cookieMinutes;
  const minuteLabel = `${minutes} ${Number(minutes) === 1 ? "minute" : "minutes"}`;

  if (outcome === "confirmed" && country.code === storeCountry.code) {
    return {
      tone: "success",
      icon: "check",
      title: `Visitor stays on the ${storeCountry.name} store`,
      body: "They picked the market they're already in, so nothing changes.",
    };
  }
  if (outcome === "confirmed") {
    return {
      tone: "success",
      icon: "check",
      title: `Visitor goes to the ${country.name} store`,
      body: design.preferences.preserveRelativePath
        ? "They land on the same page they were viewing. The popup won't show again there."
        : "They land on the home page of that store. The popup won't show again there.",
    };
  }
  if (outcome === "closed" || outcome === "stayed") {
    return {
      tone: "neutral",
      icon: "eyeOff",
      title: outcome === "closed" ? "Visitor closed the popup" : "Visitor chose to stay",
      body: `They keep shopping here. The popup stays hidden for ${minuteLabel}.`,
    };
  }
  if (scenario === "returning") {
    return {
      tone: "neutral",
      icon: "eyeOff",
      title: "Hidden for returning visitors",
      body: `This visitor closed the popup less than ${minuteLabel} ago, so it stays hidden.`,
    };
  }
  if (scenario === "inMarket" && design.preferences.hideInCurrentMarket) {
    return {
      tone: "info",
      icon: "pin",
      title: `Hidden: visitor is already in ${storeCountry.name}`,
      body: "“Hide when already in this market” is on, so nobody is asked to move to the store they're on.",
    };
  }
  if (scenario === "noDestination" && design.preferences.hideWithoutDestination) {
    return {
      tone: "info",
      icon: "globe",
      title: "Hidden: no store for this country",
      body: "“Hide when there is nowhere to send them” is on, and no rule or market covers this country.",
    };
  }
  return null;
}

export function scenarioCountry(scenario, visitorCode, storeCode) {
  return previewCountry(scenario === "inMarket" ? storeCode : visitorCode);
}

function PreviewIcon({ name }) {
  return (
    <svg
      className="ece-pp-icon"
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {name === "close" ? (
        <path
          d="M5.5 5.5 14.5 14.5M14.5 5.5 5.5 14.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ) : null}
      {name === "arrow" ? (
        <path
          d="M4.5 10h11M11 5.5 15.5 10 11 14.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {name === "chevron" ? (
        <path
          d="m6 8 4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {name === "pin" ? (
        <>
          <path
            d="M10 17.2s4.8-4 4.8-7.6a4.8 4.8 0 1 0-9.6 0c0 3.6 4.8 7.6 4.8 7.6z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="9.5" r="1.6" fill="currentColor" />
        </>
      ) : null}
      {name === "lock" ? (
        <>
          <rect x="5" y="9" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7.4 9V7.2a2.6 2.6 0 0 1 5.2 0V9" stroke="currentColor" strokeWidth="1.5" />
        </>
      ) : null}
      {name === "translate" ? (
        <>
          <path
            d="M3.5 5h7M7 3.5V5c0 3-1.8 5.5-3.8 6.5M5.2 8c.9 1.4 2.3 2.6 3.8 3.2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m10.5 16.5 3-7 3 7M11.5 14.3h4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
      {name === "check" ? (
        <path
          d="M4.5 10.4 8.2 14l7.3-8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {name === "eyeOff" ? (
        <>
          <path
            d="M3 10s2.6-4.3 7-4.3c1 0 1.9.2 2.7.5M17 10s-2.6 4.3-7 4.3c-1 0-1.9-.2-2.7-.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M4 16 16 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
      {name === "globe" ? (
        <>
          <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="10" cy="10" rx="2.8" ry="6.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3.7 10h12.6" stroke="currentColor" strokeWidth="1.4" />
        </>
      ) : null}
      {name === "replay" ? (
        <>
          <path
            d="M4.5 10a5.5 5.5 0 1 0 1.7-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M5.5 3v3.4h3.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
    </svg>
  );
}
