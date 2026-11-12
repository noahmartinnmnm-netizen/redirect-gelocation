/** Theme embed Liquid handles keyed by admin embed id. */
export const ECE_EMBED_HANDLES = {
  "ece-embed-popup": "redirect-popup",
  "ece-embed-auto": "auto-redirect",
  "ece-embed-switcher": "floating-selector",
  "ece-embed-blocker": "country-blocker",
};

/**
 * Map App Bridge `shopify.app.extensions()` theme activations onto embed rows.
 * Built for Shopify 4.2.3 requires homepage status via app.extensions().
 */
export function embedsFromAppExtensions(embeds, extensions) {
  const activations = [];
  for (const extension of extensions || []) {
    if (extension?.type !== "theme_app_extension") continue;
    for (const activation of extension.activations || []) {
      if (activation?.handle) activations.push(activation);
    }
  }

  if (!activations.length) return null;

  const byHandle = new Map(
    activations.map((activation) => [String(activation.handle).toLowerCase(), activation]),
  );

  return (embeds || []).map((embed) => {
    const handle = ECE_EMBED_HANDLES[embed.id];
    if (!handle) return embed;
    const activation = byHandle.get(handle.toLowerCase());
    if (!activation) return embed;
    return {
      ...embed,
      active: activation.status === "active",
      extensionStatus: activation.status,
    };
  });
}
