export const ECE_FAQ_ITEMS = [
  {
    id: "get-live",
    question: "How do I make redirects go live?",
    answer:
      "Create a country rule on Redirect, then turn on a theme embed under Activate redirection and save your theme. Rules alone do not run on the storefront.",
  },
  {
    id: "embeds",
    question: "Which theme embed should I use?",
    answer:
      "Redirect Popup asks before sending visitors. Automatic redirect sends them instantly. Floating switcher lets shoppers pick country and language. Turn on only what you need.",
  },
  {
    id: "not-working",
    question: "Redirects are not working. What should I check?",
    answer:
      "Confirm the rule covers the visitor’s country, an embed is Active on the published theme, and you saved the theme editor. Then reopen the storefront in a fresh visit.",
  },
  {
    id: "markets",
    question: "How do Shopify Markets work with this app?",
    answer:
      "Your custom country rules take priority. When a country has no rule, Markets can route the visitor if Markets routing is enabled on the Redirect page.",
  },
  {
    id: "popup",
    question: "Where do I edit the popup look and timing?",
    answer:
      "Use the Popup page for copy, colors, and behavior — including how long a closed popup stays hidden. Changes apply to the Redirect Popup embed.",
  },
  {
    id: "blocker",
    question: "What does Country Blocker do?",
    answer:
      "It can block visitors by country, IP, or IP range, and show your saved block screen. Allowed IPs can still browse. Turn on the Country Blocker embed to enforce it.",
  },
  {
    id: "same-country",
    question: "Can one country appear in two redirect rules?",
    answer:
      "No. Each country can belong to only one redirect rule so visitors always have a single destination.",
  },
];
