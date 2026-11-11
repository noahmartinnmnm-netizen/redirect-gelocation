import faqCss from "./eceFaqPage.css?inline";
import { ECE_FAQ_ITEMS } from "./eceFaq";

export function EceFaqPage() {
  return (
    <s-page id="ece-faq" heading="FAQ" inlineSize="large">
      <div className="ece-faq">
        <style dangerouslySetInnerHTML={{ __html: faqCss }} />

        <section className="ece-faq__intro" aria-labelledby="ece-faq-title">
          <span className="ece-faq__eyebrow">Help</span>
          <h2 className="ece-faq__title" id="ece-faq-title">
            Quick answers
          </h2>
          <p className="ece-faq__lede">
            Short answers for redirects, embeds, popup design, and country
            blocking.
          </p>
        </section>

        <ul className="ece-faq__list" aria-label="Frequently asked questions">
          {ECE_FAQ_ITEMS.map((item) => (
            <li key={item.id} className="ece-faq__item">
              <details className="ece-faq__details" id={`ece-faq-${item.id}`}>
                <summary className="ece-faq__summary">
                  <span>{item.question}</span>
                  <svg
                    className="ece-faq__chevron"
                    viewBox="0 0 20 20"
                    width="16"
                    height="16"
                    fill="none"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M5.2 7.6 10 12.4l4.8-4.8"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </summary>
                <p className="ece-faq__answer">{item.answer}</p>
              </details>
            </li>
          ))}
        </ul>

        <aside className="ece-faq__aside" aria-label="Still stuck">
          <h3 className="ece-faq__aside-title">Still stuck?</h3>
          <p className="ece-faq__aside-copy">
            Start on Dashboard: create a rule, turn on one embed, then check
            setup. Include your store domain if you contact support.
          </p>
        </aside>
      </div>
    </s-page>
  );
}
