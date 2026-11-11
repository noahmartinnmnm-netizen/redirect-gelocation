import { useLoaderData } from "react-router";
import styles from "./privacy.module.css";

export const meta = () => [
  { title: "Privacy Policy | redirect-location" },
  {
    name: "description",
    content:
      "Privacy Policy for the redirect-location Shopify app — how we collect, use, and protect merchant and storefront data.",
  },
  { name: "robots", content: "index,follow" },
];

export const loader = async () => {
  return {
    lastUpdated: "November 12, 2026",
    appName: "redirect-location",
    appUrl: "https://redirect-gelocation.onrender.com",
  };
};

export default function PrivacyPolicy() {
  const { lastUpdated, appName, appUrl } = useLoaderData();

  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>{appName}</p>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: {lastUpdated}</p>
        </header>

        <section className={styles.section}>
          <p>
            This Privacy Policy describes how <strong>{appName}</strong>{" "}
            (&quot;we&quot;, &quot;us&quot;, or &quot;the App&quot;) collects,
            uses, and shares information when merchants install and use the App
            on Shopify, and when shoppers visit a storefront where the App&apos;s
            theme features are enabled.
          </p>
          <p>
            By installing or using the App, you agree to this Privacy Policy. If
            you do not agree, please uninstall the App and stop using it.
          </p>
        </section>

        <section className={styles.section}>
          <h2>1. Who this policy covers</h2>
          <ul>
            <li>
              <strong>Merchants</strong> — Shopify store owners and staff who
              install and configure the App in Shopify Admin.
            </li>
            <li>
              <strong>Storefront visitors</strong> — shoppers who browse a
              merchant&apos;s storefront where App embeds (redirect, popup,
              floating selector, or country blocker) are active.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. Information we collect</h2>

          <h3>2.1 From merchants (Shopify Admin)</h3>
          <p>When you install the App, Shopify provides information needed to
            authenticate and operate the App, which may include:</p>
          <ul>
            <li>Shop domain and shop identifiers</li>
            <li>OAuth access tokens and session data</li>
            <li>
              Basic account details associated with the installing user (such as
              name, email, locale, and account role), as provided by Shopify
            </li>
            <li>
              App configuration you create (redirect rules, popup and blocker
              designs, blocked countries/IPs, theme embed settings, and related
              preferences), stored via Shopify APIs and/or our App database
            </li>
            <li>
              Theme and Markets data required for setup checks and routing
              features (within the App&apos;s granted Shopify scopes)
            </li>
          </ul>

          <h3>2.2 From storefront visitors</h3>
          <p>
            When merchants enable App embeds on their storefront, the App may
            process limited technical data in the visitor&apos;s browser to
            decide whether to redirect, show a popup, or block access:
          </p>
          <ul>
            <li>
              Approximate country / locale (for example via Shopify browsing
              context suggestions or a geolocation lookup)
            </li>
            <li>
              IP address, when needed for IP allowlists, block lists, or ranges
              configured by the merchant
            </li>
            <li>
              Local browser storage or cookies used for short-lived preferences
              (for example dismissing a popup or &quot;redirect once&quot;
              cooldowns)
            </li>
          </ul>
          <p>
            We do not use storefront visitor data to build marketing profiles,
            and we do not sell visitor personal information.
          </p>

          <h3>2.3 Support communications</h3>
          <p>
            If you contact us through in-app live chat or another support
            channel, we receive the information you choose to share (such as
            your message, shop domain, and contact details) so we can help you.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. How we use information</h2>
          <p>We use the information described above to:</p>
          <ul>
            <li>Install, authenticate, and operate the App on your shop</li>
            <li>
              Provide geolocation redirects, popups, market routing helpers, and
              country/IP blocking features you configure
            </li>
            <li>Remember short-lived visitor preferences required for those features</li>
            <li>Provide customer support and troubleshoot issues</li>
            <li>Maintain security, prevent abuse, and improve reliability</li>
            <li>Comply with legal obligations and Shopify platform requirements</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. How we share information</h2>
          <p>We may share information only in these limited cases:</p>
          <ul>
            <li>
              <strong>Shopify</strong> — the App runs on Shopify and uses Shopify
              APIs; merchant and shop data is processed according to Shopify&apos;s
              terms and your Shopify settings
            </li>
            <li>
              <strong>Service providers</strong> — hosting, database, geolocation
              lookup, and support tooling providers that process data on our
              behalf to run the App (for example cloud hosting and live chat)
            </li>
            <li>
              <strong>Legal requirements</strong> — when required by law,
              regulation, legal process, or to protect rights, safety, and
              security
            </li>
          </ul>
          <p>We do not sell personal information.</p>
        </section>

        <section className={styles.section}>
          <h2>5. Data retention</h2>
          <p>
            We retain merchant session and configuration data for as long as the
            App remains installed and as needed to provide the service. After you
            uninstall the App, we delete or de-identify associated session tokens
            and App-stored merchant data within a reasonable period, except where
            we must retain limited records for security, dispute resolution, or
            legal compliance.
          </p>
          <p>
            Storefront visitor lookups are processed to make a real-time routing
            or blocking decision and are not retained by us as a long-term
            visitor history. Browser cookies or local storage set for feature
            cooldowns expire according to their configured lifetime.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Data deletion and merchant rights</h2>
          <p>Merchants may:</p>
          <ul>
            <li>Uninstall the App from Shopify Admin at any time</li>
            <li>
              Request access to, correction of, or deletion of personal
              information we hold about their shop by contacting us (see Contact
              below)
            </li>
          </ul>
          <p>
            Depending on your location, you may have additional rights under
            applicable privacy laws (including GDPR or CCPA/CPRA). We will
            respond to verified requests in line with those laws.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Security</h2>
          <p>
            We use reasonable administrative, technical, and organizational
            measures to protect information, including encrypted connections
            (HTTPS) and access controls on App infrastructure. No method of
            transmission or storage is 100% secure, and we cannot guarantee
            absolute security.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. International transfers</h2>
          <p>
            The App and its service providers may process information in
            countries other than where you or your customers are located. Where
            required, we take appropriate steps to protect personal information
            in accordance with applicable law.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Children&apos;s privacy</h2>
          <p>
            The App is intended for use by Shopify merchants in a business
            context. It is not directed to children under 16, and we do not
            knowingly collect personal information from children.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Third-party services</h2>
          <p>
            The App may rely on third-party services such as Shopify, cloud
            hosting, geolocation APIs, and customer support chat. Those services
            have their own privacy policies governing their processing of data.
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The &quot;Last
            updated&quot; date at the top of this page will change when we do.
            Continued use of the App after an update means you accept the revised
            policy. For material changes, we may provide additional notice through
            the App or Shopify listing where appropriate.
          </p>
        </section>

        <section className={styles.section}>
          <h2>12. Contact</h2>
          <p>
            For privacy questions, data access or deletion requests, or other
            inquiries about this policy, contact us through the{" "}
            <strong>in-app live chat</strong> available in the App, or via the
            support channel listed on the Shopify App Store listing for{" "}
            <strong>{appName}</strong>.
          </p>
          <p>
            App homepage: <a href={appUrl}>{appUrl}</a>
          </p>
        </section>

        <footer className={styles.footer}>
          <p>
            This page is public and does not require a Shopify login. You can use
            this URL in your Shopify Partner Dashboard app listing under Privacy
            Policy.
          </p>
        </footer>
      </article>
    </main>
  );
}
