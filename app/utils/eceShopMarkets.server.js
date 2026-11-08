const ECE_MARKETS_QUERY = `#graphql
  query EceShopMarkets {
    markets(first: 50) {
      nodes {
        id
        name
        status
        conditions {
          regionsCondition {
            applicationLevel
            regions(first: 50) {
              nodes {
                name
              }
            }
          }
        }
      }
    }
  }
`;

export function mapEceMarketNodes(nodes) {
  return (nodes ?? []).flatMap((market) => {
    if (!market?.id) return [];
    const regionsCondition = market.conditions?.regionsCondition;
    const countries = (regionsCondition?.regions?.nodes ?? [])
      .map((region) => region?.name)
      .filter((name) => typeof name === "string" && name.length > 0);
    const includesAllRegions = regionsCondition?.applicationLevel === "ALL";

    return [
      {
        id: market.id,
        name: market.name || "Untitled market",
        status: market.status,
        countries:
          countries.length > 0
            ? countries
            : includesAllRegions
              ? ["All regions"]
              : [],
        includesAllRegions,
      },
    ];
  });
}

export function marketsErrorText(error) {
  const parts = [];
  if (typeof error === "string") parts.push(error);
  if (error?.message) parts.push(error.message);

  const graphQLErrors = [
    ...(error?.body?.errors?.graphQLErrors ?? []),
    ...(error?.errors?.graphQLErrors ?? []),
    ...(error?.cause?.graphQLErrors ?? []),
  ];
  for (const item of graphQLErrors) {
    if (item?.message) parts.push(item.message);
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function isMarketsAccessError(text) {
  return /access denied|not approved|required access|read_markets/i.test(
    text || "",
  );
}

export function marketsLoadErrorMessage(errors) {
  const text = Array.isArray(errors)
    ? marketsErrorText({ message: errors.map((error) => error?.message || "").join(" ") })
    : marketsErrorText(errors);

  if (!text || /occurred while fetching from the API/i.test(text)) {
    return "Shopify Markets could not be loaded.";
  }
  if (isMarketsAccessError(text)) {
    return "Shopify Markets could not be loaded. Approve read_markets for this app, then reload.";
  }
  return `Shopify Markets could not be loaded. ${text.slice(0, 180)}`;
}

export async function loadEceShopMarkets(admin) {
  try {
    const response = await admin.graphql(ECE_MARKETS_QUERY);
    const payload = await response.json();
    if (payload?.errors?.length) {
      const text = marketsErrorText({
        message: payload.errors.map((error) => error?.message || "").join(" "),
      });
      console.error("ece markets query failed", text);
      return {
        markets: [],
        marketsError: marketsLoadErrorMessage(payload.errors),
        marketsAccessDenied: isMarketsAccessError(text),
      };
    }
    return {
      markets: mapEceMarketNodes(payload?.data?.markets?.nodes),
      marketsError: null,
      marketsAccessDenied: false,
    };
  } catch (error) {
    const text = marketsErrorText(error);
    console.error("ece markets query failed", text);
    return {
      markets: [],
      marketsError: marketsLoadErrorMessage([{ message: text }]),
      marketsAccessDenied: isMarketsAccessError(text),
    };
  }
}
