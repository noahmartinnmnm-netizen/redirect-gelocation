/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import supportCss from "./eceSupportPanels.css?inline";

const DISMISS_KEY = "ece-free-setup-assist-dismissed";

const CHANNELS = [
  {
    id: "chat",
    label: "Live Chat",
    icon: "chat",
    copy: "Chat with our support team in real time for instant help.",
    note: "Include your store domain and we’ll help you turn redirection on.",
  },
  {
    id: "email",
    label: "Email support",
    icon: "mail",
    copy: "Email us and we'll get back to you as soon as possible.",
    note: "Email us your store domain and we’ll reply as soon as we can.",
  },
  {
    id: "faq",
    label: "FAQs",
    icon: "list",
    copy: "Discover answers to common questions in our FAQ section.",
    note: "Use Configure, turn the embed on, then refresh. Active means it is live.",
  },
  {
    id: "docs",
    label: "Help Docs",
    icon: "docs",
    copy: "Find a solution with our documents and tutorials.",
    note: "Configure opens the theme editor so you can turn the embed on.",
  },
];

export function EceSupportPanels() {
  const shopify = useAppBridge();
  const [assistOpen, setAssistOpen] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") setAssistOpen(false);
    } catch {
      /* storage can be blocked in the admin iframe */
    }
  }, []);

  function openChannel(channel) {
    shopify.toast.show(channel.note);
  }

  function dismissAssist() {
    setAssistOpen(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* dismissal still applies for this view */
    }
  }

  return (
    <div className="ece-support" id="ece-support">
      <style dangerouslySetInnerHTML={{ __html: supportCss }} />
      {assistOpen ? (
        <div className="ece-support__assist" id="ece-setup-assist" role="region" aria-label="Free setup assistance">
          <span className="ece-support__assist-icon">
            <Icon name="chat" />
          </span>
          <div className="ece-support__assist-body">
            <span className="ece-support__badge">Free Setup Assistance</span>
            <p className="ece-support__assist-copy">
              Need help? We offer free setup assistance. We&apos;ll help you turn redirection on.
            </p>
          </div>
          <div className="ece-support__assist-actions">
            <button type="button" className="ece-support__chat" id="ece-setup-assist-chat" onClick={() => openChannel(CHANNELS[0])}>
              Chat now
            </button>
            <button type="button" className="ece-support__dismiss" aria-label="Dismiss free setup assistance" title="Dismiss" onClick={dismissAssist}>
              <Icon name="close" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="ece-support__card" id="ece-need-help" role="region" aria-labelledby="ece-need-help-title">
        <h2 className="ece-support__title" id="ece-need-help-title">
          Need any help?
        </h2>
        <p className="ece-support__lede">Pick the channel that works best for you.</p>
        <div className="ece-support__grid">
          {CHANNELS.map((channel) => (
            <button
              key={channel.id}
              type="button"
              className="ece-support__item"
              id={`ece-support-${channel.id}`}
              onClick={() => openChannel(channel)}
            >
              <span className="ece-support__item-icon">
                <Icon name={channel.icon} />
              </span>
              <span className="ece-support__label">{channel.label}</span>
              <span className="ece-support__copy">{channel.copy}</span>
              <span className="ece-support__more" aria-hidden="true">
                Open
                <Icon name="arrow" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Icon({ name, tone }) {
  const toneClass = tone ? ` is-${tone}` : "";
  return (
    <svg
      className={`ece-support__glyph${toneClass}`}
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {name === "chat" ? (
        <>
          <path
            d="M4.2 4.8h9.1c.8 0 1.5.7 1.5 1.5v4.3c0 .8-.7 1.5-1.5 1.5H8.1L5.4 15.6v-3.5H4.2c-.8 0-1.5-.7-1.5-1.5V6.3c0-.8.7-1.5 1.5-1.5z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M6 8.1h6.2M6 10.4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : null}
      {name === "mail" ? (
        <>
          <rect x="3.2" y="4.8" width="13.6" height="10.2" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3.8 6.2 10 10.6l6.2-4.4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </>
      ) : null}
      {name === "list" ? (
        <>
          <circle cx="4.6" cy="6.2" r="1" fill="currentColor" />
          <circle cx="4.6" cy="10" r="1" fill="currentColor" />
          <circle cx="4.6" cy="13.8" r="1" fill="currentColor" />
          <path d="M7.4 6.2h8.2M7.4 10h8.2M7.4 13.8h6.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
      {name === "docs" ? (
        <>
          <path
            d="M6 3.4h5.1L15.2 7.4v8.2c0 .7-.6 1.3-1.3 1.3H6.3c-.7 0-1.3-.6-1.3-1.3V4.7c0-.7.6-1.3 1.3-1.3z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M11 3.6v3.8h3.8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M7.2 10.2h5.2M7.2 12.6h3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : null}
      {name === "close" ? (
        <path d="M6 6.2 14 14.2M14 6.2 6 14.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ) : null}
      {name === "arrow" ? (
        <path
          d="M4.5 10h10.5M11 6l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}
