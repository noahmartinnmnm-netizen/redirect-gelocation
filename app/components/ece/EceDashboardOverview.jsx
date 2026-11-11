/* eslint-disable react/prop-types */
import dashCss from "./eceDashboardOverview.css?inline";

function uniqueCountryCount(rules) {
  const codes = new Set();
  for (const rule of rules) {
    for (const country of rule.countries ?? []) {
      if (country?.code) codes.add(String(country.code).toUpperCase());
    }
  }
  return codes.size;
}

export function EceDashboardOverview({
  rules = [],
  rulesError,
  embeds = [],
  activation = null,
  onCreateRedirect,
  onViewRedirects,
  onOpenPopup,
  onOpenBlocker,
}) {
  const ruleCount = rules.length;
  const countriesCovered = uniqueCountryCount(rules);
  const activeEmbeds = embeds.filter((embed) => embed.active).length;
  const hasLiveRouting = ruleCount > 0 && activeEmbeds > 0;
  const needsEmbed = ruleCount > 0 && activeEmbeds === 0;

  return (
    <div className="ece-dash" id="ece-dashboard-overview">
      <style dangerouslySetInnerHTML={{ __html: dashCss }} />

      <section className="ece-dash__stats" aria-label="Routing snapshot">
        <article className={`ece-dash__stat${ruleCount ? " is-live" : ""}`}>
          <span className="ece-dash__stat-label">Redirect rules</span>
          <span className="ece-dash__stat-value">{ruleCount}</span>
          <span className="ece-dash__stat-hint">
            {ruleCount ? "Ready to match by country" : "Create your first rule"}
          </span>
        </article>
        <article className={`ece-dash__stat${countriesCovered ? " is-live" : ""}`}>
          <span className="ece-dash__stat-label">Countries covered</span>
          <span className="ece-dash__stat-value">{countriesCovered}</span>
          <span className="ece-dash__stat-hint">
            {countriesCovered
              ? "Mapped to a destination"
              : "Pick markets that matter most"}
          </span>
        </article>
        <article
          className={`ece-dash__stat${
            activeEmbeds ? " is-live" : needsEmbed ? " is-warn" : ""
          }`}
        >
          <span className="ece-dash__stat-label">Theme embeds live</span>
          <span className="ece-dash__stat-value">
            {activeEmbeds}/{embeds.length || 0}
          </span>
          <span className="ece-dash__stat-hint">
            {activeEmbeds
              ? "Running on your published theme"
              : "Required for storefront redirects"}
          </span>
        </article>
      </section>

      {needsEmbed ? (
        <div className="ece-dash__alert" role="status">
          <span className="ece-dash__alert-icon">
            <Icon name="alert" />
          </span>
          <div className="ece-dash__alert-body">
            <h3 className="ece-dash__alert-title">
              Rules won&apos;t run until an embed is on
            </h3>
            <p className="ece-dash__alert-copy">
              Turn on Automatic redirect or the Geolocation popup in Activate
              redirection next. Shoppers only get routed after the theme embed
              is saved.
            </p>
          </div>
        </div>
      ) : null}

      {!ruleCount && !rulesError ? (
        <div className="ece-dash__alert is-info" role="status">
          <span className="ece-dash__alert-icon">
            <Icon name="spark" />
          </span>
          <div className="ece-dash__alert-body">
            <h3 className="ece-dash__alert-title">
              Start with one high-intent market
            </h3>
            <p className="ece-dash__alert-copy">
              Route US, UK, EU, or AU visitors to the storefront with their
              currency and shipping — then expand country coverage as you grow.
            </p>
          </div>
        </div>
      ) : null}

      <section className="ece-dash__hero" aria-labelledby="ece-dash-hero-title">
        <div>
          <span className="ece-dash__eyebrow">Next step</span>
          <h2 className="ece-dash__title" id="ece-dash-hero-title">
            {hasLiveRouting
              ? "Routing is live — refine how visitors are sent"
              : needsEmbed
                ? "Turn on a theme embed to go live"
                : "Create a redirect for your top market"}
          </h2>
          <p className="ece-dash__lede">
            {hasLiveRouting
              ? "Add more countries, polish the popup, or block traffic you do not want."
              : needsEmbed
                ? "Your rules are saved. Enable an embed so the storefront can use them."
                : "Pick a country, set the destination URL, then activate redirection in your theme."}
          </p>
        </div>
        <div className="ece-dash__hero-actions">
          {needsEmbed ? (
            <a className="ece-dash__btn" href="#ece-embeds">
              Activate redirection
            </a>
          ) : (
            <button type="button" className="ece-dash__btn" onClick={onCreateRedirect}>
              Create redirect
            </button>
          )}
          <button
            type="button"
            className="ece-dash__btn is-secondary"
            onClick={onViewRedirects}
          >
            Manage rules
          </button>
        </div>
      </section>

      {activation}

      <section
        className="ece-dash__panel"
        aria-labelledby="ece-dash-features-title"
      >
        <div className="ece-dash__section-head">
          <div>
            <h2 className="ece-dash__section-title" id="ece-dash-features-title">
              Your tools
            </h2>
            <p className="ece-dash__section-lede">
              Jump into redirects, popup design, or country blocking when you
              need them.
            </p>
          </div>
        </div>

        <div className="ece-dash__features">
          <article className="ece-dash__feature">
            <div className="ece-dash__feature-top">
              <span className="ece-dash__icon is-green">
                <Icon name="redirect" />
              </span>
              <span
                className={`ece-dash__badge${ruleCount ? " is-ready" : " is-action"}`}
              >
                {ruleCount ? `${ruleCount} live` : "Start here"}
              </span>
            </div>
            <div>
              <h3 className="ece-dash__feature-name">Country redirects</h3>
              <p className="ece-dash__feature-copy">
                Send shoppers to the right store, market URL, or landing page so
                they never land on the wrong currency.
              </p>
            </div>
            <div className="ece-dash__feature-actions">
              <button type="button" className="ece-dash__btn is-small" onClick={onCreateRedirect}>
                Add rule
              </button>
              <button type="button" className="ece-dash__link" onClick={onViewRedirects}>
                View all
              </button>
            </div>
          </article>

          <article className="ece-dash__feature">
            <div className="ece-dash__feature-top">
              <span className="ece-dash__icon">
                <Icon name="popup" />
              </span>
              <span className="ece-dash__badge">Higher trust</span>
            </div>
            <div>
              <h3 className="ece-dash__feature-name">Geolocation popup</h3>
              <p className="ece-dash__feature-copy">
                Ask before redirecting when you want control without surprising
                returning customers.
              </p>
            </div>
            <div className="ece-dash__feature-actions">
              <button type="button" className="ece-dash__btn is-small" onClick={onOpenPopup}>
                Design popup
              </button>
            </div>
          </article>

          <article className="ece-dash__feature">
            <div className="ece-dash__feature-top">
              <span className="ece-dash__icon is-amber">
                <Icon name="lock" />
              </span>
              <span className="ece-dash__badge">Protect store</span>
            </div>
            <div>
              <h3 className="ece-dash__feature-name">Country blocker</h3>
              <p className="ece-dash__feature-copy">
                Stop traffic from countries you don&apos;t ship to, or reduce
                fraud-heavy regions before checkout.
              </p>
            </div>
            <div className="ece-dash__feature-actions">
              <button type="button" className="ece-dash__btn is-small" onClick={onOpenBlocker}>
                Set blocks
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function Icon({ name }) {
  return (
    <svg
      className="ece-dash__glyph"
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
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
            d="M10.6 4.2h5.2v5.2M15.6 4.4 9.4 10.6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
      {name === "popup" ? (
        <>
          <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.4 7.4h13.2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7.6 11.6h4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
      {name === "alert" ? (
        <>
          <path
            d="M10 3.6 17.2 16H2.8L10 3.6z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M10 8.2v3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="14" r="0.8" fill="currentColor" />
        </>
      ) : null}
      {name === "spark" ? (
        <path
          d="M10 2.8v3.2M10 14v3.2M2.8 10h3.2M14 10h3.2M5.2 5.2l2.1 2.1M12.7 12.7l2.1 2.1M14.8 5.2l-2.1 2.1M7.3 12.7l-2.1 2.1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
