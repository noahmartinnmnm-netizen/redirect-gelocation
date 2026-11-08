/* eslint-disable react/prop-types */
import activateCss from "./eceActivateRedirection.css?inline";

const EMBED_ICONS = {
  "ece-embed-popup": "popup",
  "ece-embed-auto": "redirect",
  "ece-embed-switcher": "globe",
};

export function EceActivateRedirection({ embeds, embedsError, onConfigure }) {
  const activeCount = embeds.filter((embed) => embed.active).length;

  return (
    <section
      className="ece-activate"
      id="ece-embeds"
      aria-labelledby="ece-embeds-title"
    >
      <style dangerouslySetInnerHTML={{ __html: activateCss }} />
      <div className="ece-activate__head">
        <div>
          <h2 className="ece-activate__title" id="ece-embeds-title">
            Activate redirection
          </h2>
          <p className="ece-activate__lede">
            Turn on an embed in your published theme. Changes go live as soon as you save the theme.
          </p>
        </div>
        <span className={`ece-activate__count${activeCount ? " is-live" : ""}`}>
          <span className="ece-activate__dot" aria-hidden="true" />
          {activeCount} of {embeds.length} active
        </span>
      </div>

      {embedsError ? (
        <div className="ece-activate__error" id="ece-embeds-error" role="alert">
          <strong>Embed status was not loaded.</strong> {embedsError}
        </div>
      ) : null}

      <div className="ece-activate__grid">
        {embeds.map((embed) => (
          <article
            key={embed.id}
            id={embed.id}
            className={`ece-activate__tile${embed.active ? " is-active" : ""}`}
          >
            <div className="ece-activate__tile-top">
              <span className="ece-activate__icon">
                <Icon name={EMBED_ICONS[embed.id] || "globe"} />
              </span>
              <span className={`ece-activate__status${embed.active ? " is-active" : ""}`}>
                <span className="ece-activate__dot" aria-hidden="true" />
                {embed.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="ece-activate__body">
              <h3 className="ece-activate__name">{embed.label}</h3>
              <p className="ece-activate__copy">{embed.detail}</p>
            </div>
            <button
              type="button"
              id={`${embed.id}-configure`}
              className={`ece-activate__btn${embed.active ? "" : " is-primary"}`}
              onClick={() => onConfigure(embed)}
            >
              {embed.active ? "Configure" : "Turn on"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Icon({ name }) {
  return (
    <svg
      className="ece-activate__glyph"
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {name === "popup" ? (
        <>
          <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.4 7.4h13.2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7.6 11.6h4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
            d="M10.6 4.2h5.2v5.2M15.6 4.4 9.4 10.6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
      {name === "globe" ? (
        <>
          <circle cx="10" cy="10" r="6.6" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="10" cy="10" rx="3" ry="6.6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.6 10h12.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  );
}
