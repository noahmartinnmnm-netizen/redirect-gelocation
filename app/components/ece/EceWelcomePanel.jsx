/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import welcomeCss from "./eceWelcomePanel.css?inline";

const GUIDE_COLLAPSED_KEY = "ece-setup-guide-collapsed";

const STEPS = [
  { id: "goal", label: "Choose a goal", hint: "Decide where visitors go", icon: "flag" },
  { id: "activation", label: "Turn it on", hint: "Enable it in your theme", icon: "eye" },
  { id: "check", label: "Check setup", hint: "Confirm everything works", icon: "check" },
];

const GOAL_VIEWS = [
  { id: "redirect", label: "Redirect to Another Store", icon: "globe", tone: "green" },
  { id: "block", label: "Block Country", icon: "lock", tone: "neutral" },
  { id: "markets", label: "Shopify Markets", icon: "globe", tone: "blue" },
];

const ACTIVATION_VIEWS = [
  { id: "auto", label: "Auto Redirect", icon: "redirect", tone: "blue" },
  { id: "popup", label: "Geolocation Popup", icon: "pin", tone: "neutral" },
  { id: "selector", label: "Floating selector", icon: "selector", tone: "neutral" },
];

const CHECK_VIEWS = [
  { id: "check", label: "Check setup", icon: "check", tone: "gold" },
  { id: "help", label: "Need help?", icon: "help", tone: "neutral" },
];

function shopLabel(shop) {
  const handle = String(shop || "")
    .replace(/\.myshopify\.com$/i, "")
    .trim();
  if (!handle) return "there";

  const titled = handle
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const hexName = handle.match(/^(.*)-([a-f0-9]{6,8})$/i);
  if (!hexName) return titled;

  const name = hexName[1]
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return `${name} (${hexName[2]})`;
}

function readGuideCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(GUIDE_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeGuideCollapsed(collapsed) {
  try {
    if (collapsed) window.localStorage.setItem(GUIDE_COLLAPSED_KEY, "1");
    else window.localStorage.removeItem(GUIDE_COLLAPSED_KEY);
  } catch {
    // The embedded admin can block storage. The guide still collapses for this view.
  }
}

export function EceWelcomePanel({
  shop,
  onCreateRedirect,
  onViewRedirects,
  onSetupMarkets,
  onViewMarkets,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [step, setStep] = useState("goal");
  const [goalView, setGoalView] = useState("redirect");
  const [activationView, setActivationView] = useState("auto");
  const [checkView, setCheckView] = useState("check");

  useEffect(() => {
    setCollapsed(readGuideCollapsed());
  }, []);

  function hideGuide() {
    setCollapsed(true);
    writeGuideCollapsed(true);
  }

  function showGuide() {
    setCollapsed(false);
    writeGuideCollapsed(false);
  }

  if (collapsed) {
    return (
      <section
        className="ece-welcome is-collapsed"
        id="ece-welcome-panel"
        aria-label="Setup guide"
      >
        <style dangerouslySetInnerHTML={{ __html: welcomeCss }} />
        <div className="ece-welcome__collapsed-top">
          <span className="ece-welcome__collapsed-icon">
            <Icon name="flag" />
          </span>
          <div className="ece-welcome__collapsed-text">
            <h2 className="ece-welcome__title">Setup guide</h2>
            <p className="ece-welcome__lede">
              Setup guide is hidden. Open it anytime to finish setup.
            </p>
          </div>
          <div className="ece-welcome__collapsed-progress">
            <SetupProgress compact />
          </div>
          <button
            type="button"
            className="ece-welcome__show"
            onClick={showGuide}
          >
            Show setup guide
          </button>
        </div>
      </section>
    );
  }

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const currentStep = STEPS[stepIndex];
  const views =
    step === "activation" ? ACTIVATION_VIEWS : step === "check" ? CHECK_VIEWS : GOAL_VIEWS;
  const activeView =
    step === "activation" ? activationView : step === "check" ? checkView : goalView;
  const setActiveView =
    step === "activation" ? setActivationView : step === "check" ? setCheckView : setGoalView;

  return (
    <section className="ece-welcome" id="ece-welcome-panel" aria-label="Welcome">
      <style dangerouslySetInnerHTML={{ __html: welcomeCss }} />
      <div className="ece-welcome__head">
        <div className="ece-welcome__intro">
          <span className="ece-welcome__eyebrow">Setup guide</span>
          <h2 className="ece-welcome__title">
            Hey {shopLabel(shop)}, welcome to Blaze Country Redirect
          </h2>
          <p className="ece-welcome__lede">
            Set a goal, enable it in your theme, and your visitors will reach the right store.
          </p>
        </div>
        <button
          type="button"
          className="ece-welcome__close"
          aria-label="Hide setup guide"
          title="Hide setup guide"
          onClick={hideGuide}
        >
          <Icon name="close" />
        </button>
      </div>

      <SetupProgress />

      <div className="ece-welcome__body">
        <div
          className="ece-welcome__steps"
          role="tablist"
          aria-label="Setup steps"
          aria-orientation="vertical"
        >
          {STEPS.map((item, index) => {
            const active = step === item.id;
            const done = item.id === "goal";
            return (
              <button
                key={item.id}
                type="button"
                id={`ece-welcome-step-${item.id}`}
                className={`ece-welcome__step${active ? " is-active" : ""}${done ? " is-done" : ""}`}
                role="tab"
                aria-selected={active}
                aria-controls={`ece-welcome-panel-${item.id}`}
                onClick={() => setStep(item.id)}
              >
                <span className="ece-welcome__marker" aria-hidden="true">
                  {done ? <Icon name="check" /> : index + 1}
                </span>
                <span className="ece-welcome__step-text">
                  <span className="ece-welcome__step-label">{item.label}</span>
                  <span className="ece-welcome__step-hint">{item.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="ece-welcome__stage"
          id={`ece-welcome-panel-${step}`}
          role="tabpanel"
          aria-labelledby={`ece-welcome-step-${step}`}
        >
          <div className="ece-welcome__stage-head">
            <div>
              <span className="ece-welcome__stage-count">
                Step {stepIndex + 1} of {STEPS.length}
              </span>
              <h3 className="ece-welcome__stage-title">{currentStep.label}</h3>
            </div>
            <div className="ece-welcome__subnav" role="tablist" aria-label={stepLabel(step)}>
              {views.map((item) => {
                const selected = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`ece-welcome-view-${step}-${item.id}`}
                    className={`ece-welcome__chip is-${item.tone}${selected ? " is-selected" : ""}`}
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveView(item.id)}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {step === "goal" && goalView === "redirect" ? (
            <RedirectStoreCard onCreate={onCreateRedirect} onView={onViewRedirects} />
          ) : null}
          {step === "goal" && goalView === "block" ? <BlockCountryCard /> : null}
          {step === "goal" && goalView === "markets" ? (
            <ShopifyMarketsCard onSetup={onSetupMarkets} onView={onViewMarkets} />
          ) : null}
          {step === "activation" && activationView === "auto" ? <AutoRedirectCard /> : null}
          {step === "activation" && activationView === "popup" ? <PopupCard /> : null}
          {step === "activation" && activationView === "selector" ? <FloatingSelectorCard /> : null}
          {step === "check" && checkView === "check" ? <CheckSetupCard /> : null}
          {step === "check" && checkView === "help" ? <HelpCard /> : null}
        </div>
      </div>
    </section>
  );
}

function stepLabel(step) {
  if (step === "activation") return "Activation options";
  if (step === "check") return "Check setup options";
  return "Goal options";
}

function SetupProgress({ compact = false }) {
  return (
    <div className={`ece-welcome__progress${compact ? " is-compact" : ""}`}>
      <div className="ece-welcome__meter">
        <span>1 of 2 steps complete</span>
        <span className="ece-welcome__meter-value">50%</span>
      </div>
      <div
        className="ece-welcome__track"
        role="progressbar"
        aria-valuenow={50}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Setup progress"
      >
        <div className="ece-welcome__fill" />
      </div>
    </div>
  );
}

function CardHead({ icon, tone, title, badge }) {
  return (
    <div className="ece-welcome__card-top">
      <span className={`ece-welcome__card-icon is-${tone}`}>
        <Icon name={icon} />
      </span>
      <h4 className="ece-welcome__card-title">{title}</h4>
      {badge}
    </div>
  );
}

function RedirectStoreCard({ onCreate, onView }) {
  return (
    <article className="ece-welcome__card">
      <CardHead icon="globe" tone="green" title="Send visitors to the right store" />
      <p className="ece-welcome__copy">
        Redirect by country to another store. Pick the countries, add the destination URL, and
        you&apos;re done.
      </p>
      <div className="ece-welcome__actions">
        <button type="button" className="ece-welcome__btn" onClick={onCreate}>
          Create Redirect
        </button>
        <button type="button" className="ece-welcome__link" onClick={onView}>
          View redirects
        </button>
      </div>
    </article>
  );
}

function ShopifyMarketsCard({ onSetup, onView }) {
  return (
    <article className="ece-welcome__card">
      <CardHead icon="globe" tone="blue" title="Use Shopify Markets" />
      <p className="ece-welcome__copy">Send shoppers to their local market.</p>
      <div className="ece-welcome__actions">
        <button type="button" className="ece-welcome__btn" onClick={onSetup}>
          Set Up Markets
        </button>
        <button type="button" className="ece-welcome__link" onClick={onView}>
          View markets
        </button>
      </div>
    </article>
  );
}

function BlockCountryCard() {
  return (
    <article className="ece-welcome__card">
      <CardHead icon="lock" tone="neutral" title="Block visitors by country" />
      <p className="ece-welcome__copy">Stop shoppers from selected countries from entering this store.</p>
      <div className="ece-welcome__actions">
        <button type="button" className="ece-welcome__btn">
          Create block
        </button>
        <button type="button" className="ece-welcome__link">
          View blocks
        </button>
      </div>
    </article>
  );
}

function AutoRedirectCard() {
  return (
    <article className="ece-welcome__card">
      <CardHead
        icon="redirect"
        tone="blue"
        title="Redirect automatically"
        badge={<span className="ece-welcome__badge is-info">Disabled</span>}
      />
      <p className="ece-welcome__copy">
        Send customers to the right store instantly, with no popup and no extra step.
      </p>
      <div className="ece-welcome__actions">
        <button type="button" className="ece-welcome__btn">
          Enable Auto Redirect
        </button>
      </div>
    </article>
  );
}

function PopupCard() {
  return (
    <article className="ece-welcome__card">
      <CardHead
        icon="pin"
        tone="blue"
        title="Show a geolocation popup"
        badge={<span className="ece-welcome__badge is-info">Disabled</span>}
      />
      <p className="ece-welcome__copy">
        Let visitors confirm their country in a popup before they continue.
      </p>
      <div className="ece-welcome__actions">
        <button type="button" className="ece-welcome__btn">
          Enable Geolocation Popup
        </button>
      </div>
    </article>
  );
}

function FloatingSelectorCard() {
  return (
    <article className="ece-welcome__card">
      <CardHead
        icon="selector"
        tone="blue"
        title="Show a floating selector"
        badge={<span className="ece-welcome__badge is-info">Disabled</span>}
      />
      <p className="ece-welcome__copy">
        Let visitors switch country and language from a selector that stays on the page.
      </p>
      <div className="ece-welcome__actions">
        <button type="button" className="ece-welcome__btn">
          Enable Floating Selector
        </button>
      </div>
    </article>
  );
}

function CheckSetupCard() {
  return (
    <article className="ece-welcome__card">
      <CardHead icon="check" tone="gold" title="Check your setup" />
      <ul className="ece-welcome__statuses">
        <li className="ece-welcome__status">
          <span className="ece-welcome__status-name">
            Auto Redirect
            <span className="ece-welcome__badge is-warning">Disabled</span>
          </span>
          <button type="button" className="ece-welcome__btn is-small">
            Turn it on
          </button>
        </li>
        <li className="ece-welcome__status">
          <span className="ece-welcome__status-name">
            Geolocation Popup
            <span className="ece-welcome__badge is-warning">Disabled</span>
          </span>
          <button type="button" className="ece-welcome__btn is-small">
            Turn it on
          </button>
        </li>
        <li className="ece-welcome__status">
          <span className="ece-welcome__status-name">
            Floating selector
            <span className="ece-welcome__badge is-warning">Disabled</span>
          </span>
          <button type="button" className="ece-welcome__btn is-small">
            Turn it on
          </button>
        </li>
      </ul>
    </article>
  );
}

function HelpCard() {
  return (
    <article className="ece-welcome__card">
      <CardHead icon="help" tone="neutral" title="Need help?" />
      <p className="ece-welcome__copy">
        Pick a goal, turn it on in your theme, then use Check setup to confirm Auto Redirect, the Geolocation Popup, and the Floating selector.
      </p>
    </article>
  );
}

function Icon({ name, tone }) {
  const toneClass = tone ? ` is-${tone}` : "";
  return (
    <svg
      className={`ece-welcome__glyph${toneClass}`}
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {name === "flag" ? (
        <>
          <path d="M5.2 3.4v13.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path
            d="M5.2 4.2h8.4L12.1 6.8l1.5 2.6H5.2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </>
      ) : null}
      {name === "eye" ? (
        <>
          <path
            d="M2.4 10s2.7-4.4 7.6-4.4S17.6 10 17.6 10s-2.7 4.4-7.6 4.4S2.4 10 2.4 10z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.5" />
        </>
      ) : null}
      {name === "check" ? (
        <path
          d="M4.2 10.4 8 14.1l7.8-8.2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {name === "globe" ? (
        <>
          <circle cx="10" cy="10" r="6.6" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="10" cy="10" rx="3" ry="6.6" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M3.6 10h12.8M4.6 6.7h10.8M4.6 13.3h10.8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {name === "lock" ? (
        <>
          <rect x="4.4" y="8.8" width="11.2" height="7.4" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M7 8.8V6.9a3 3 0 0 1 6 0v1.9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {name === "redirect" ? (
        <>
          <path
            d="M8.2 5.2H5.6A1.4 1.4 0 0 0 4.2 6.6v7.8A1.4 1.4 0 0 0 5.6 15.8h7.8a1.4 1.4 0 0 0 1.4-1.4V11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.6 4.2h5.2v5.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.6 4.4 9.4 10.6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {name === "pin" ? (
        <>
          <path
            d="M10 17.2s4.8-4 4.8-7.6a4.8 4.8 0 1 0-9.6 0c0 3.6 4.8 7.6 4.8 7.6z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="9.5" r="1.5" fill="currentColor" />
        </>
      ) : null}
      {name === "selector" ? (
        <>
          <rect x="2.6" y="5.2" width="14.8" height="9.6" rx="4.8" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M5.6 10h4.6M12.1 8.3 13.9 10l-1.8 1.7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
      {name === "help" ? (
        <>
          <circle cx="10" cy="10" r="6.6" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 8.15a2.05 2.05 0 1 1 2.55 1.95c-.7.28-1.05.78-1.05 1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="9.5" cy="13.7" r="0.8" fill="currentColor" />
        </>
      ) : null}
      {name === "close" ? (
        <path
          d="M5.2 5.2 14.8 14.8M14.8 5.2 5.2 14.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
