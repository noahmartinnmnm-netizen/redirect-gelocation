import {
  ECE_MARKETS_ROUTING_KEY,
  ECE_METAFIELD_NAMESPACE,
  ECE_RULE_COUNTRY_KEY,
  isMarketsRoutingOn,
  parseStoredRouteBook,
  ruleCountryDocument,
} from "../components/ece/eceRuleModel";

const ROUTE_BOOK_QUERY = `#graphql
  query EceRouteBook($namespace: String!, $rulesKey: String!, $marketsKey: String!) {
    shop {
      id
      routeBook: metafield(namespace: $namespace, key: $rulesKey) {
        value
      }
      marketsRouting: metafield(namespace: $namespace, key: $marketsKey) {
        value
      }
    }
  }
`;

const LIST_DEFINITIONS = `#graphql
  query EceShopFieldDefinitions($namespace: String!) {
    metafieldDefinitions(first: 10, ownerType: SHOP, namespace: $namespace) {
      nodes {
        key
      }
    }
  }
`;

const CREATE_DEFINITION = `#graphql
  mutation EceCreateShopField($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const SAVE_ROUTE_BOOK = `#graphql
  mutation EceSaveRouteBook($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const FIELD_DEFINITIONS = [
  {
    name: "Rule country",
    key: ECE_RULE_COUNTRY_KEY,
    type: "json",
    description:
      "Rules and the country-to-URL map for this shop. Storefront liquid reads shop.metafields.ece.rule_country.",
  },
  {
    name: "Markets routing",
    key: ECE_MARKETS_ROUTING_KEY,
    type: "single_line_text_field",
    description:
      "on or off. When off, automatic redirect follows custom rules only. A missing value means on.",
  },
];

const definedShops = new Set();

export async function loadEceRouteBook(admin) {
  try {
    const response = await admin.graphql(ROUTE_BOOK_QUERY, {
      variables: {
        namespace: ECE_METAFIELD_NAMESPACE,
        rulesKey: ECE_RULE_COUNTRY_KEY,
        marketsKey: ECE_MARKETS_ROUTING_KEY,
      },
    });
    const payload = await response.json();
    if (payload?.errors?.length) {
      console.error(
        "ece route book query failed",
        graphqlErrorText(payload.errors),
      );
      return emptyRouteBook(payload?.data?.shop?.id || null);
    }

    const shop = payload?.data?.shop;
    if (!shop?.id) return emptyRouteBook(null);

    const markets = marketsRoutingState(shop.marketsRouting?.value);
    const parsed = parseStoredRouteBook(shop.routeBook?.value ?? null);
    if (!parsed.ok) {
      return {
        shopId: shop.id,
        rules: [],
        rulesError: parsed.error,
        ...markets,
      };
    }
    return { shopId: shop.id, rules: parsed.rules, rulesError: null, ...markets };
  } catch (error) {
    console.error(
      "ece route book query failed",
      error?.message || "unknown error",
    );
    return emptyRouteBook(null);
  }
}

export async function writeEceMarketsRouting(admin, shopId, enabled) {
  const ready = await ensureEceDefinitions(admin, shopId);
  if (!ready.ok) return ready;

  return saveShopFields(admin, [
    {
      ownerId: shopId,
      namespace: ECE_METAFIELD_NAMESPACE,
      key: ECE_MARKETS_ROUTING_KEY,
      type: "single_line_text_field",
      value: enabled ? "on" : "off",
    },
  ]);
}

export async function writeEceRouteBook(admin, shopId, rules) {
  const ready = await ensureEceDefinitions(admin, shopId);
  if (!ready.ok) return ready;

  return saveShopFields(admin, [
    metafieldInput(shopId, ECE_RULE_COUNTRY_KEY, ruleCountryDocument(rules)),
  ]);
}

async function ensureEceDefinitions(admin, shopId) {
  if (definedShops.has(shopId)) return { ok: true };

  try {
    const response = await admin.graphql(LIST_DEFINITIONS, {
      variables: { namespace: ECE_METAFIELD_NAMESPACE },
    });
    const payload = await response.json();
    if (payload?.errors?.length) {
      console.error(
        "ece metafield definitions failed",
        graphqlErrorText(payload.errors),
      );
      return { ok: false, error: "The shop fields could not be prepared." };
    }

    const existing = new Set(
      (payload?.data?.metafieldDefinitions?.nodes ?? []).map((node) => node.key),
    );

    for (const field of FIELD_DEFINITIONS) {
      if (existing.has(field.key)) continue;
      const created = await createShopField(admin, field);
      if (!created.ok) return created;
    }

    definedShops.add(shopId);
    return { ok: true };
  } catch (error) {
    console.error(
      "ece metafield definitions failed",
      error?.message || "unknown error",
    );
    return { ok: false, error: "The shop fields could not be prepared." };
  }
}

async function createShopField(admin, field) {
  const response = await admin.graphql(CREATE_DEFINITION, {
    variables: {
      definition: {
        name: field.name,
        namespace: ECE_METAFIELD_NAMESPACE,
        key: field.key,
        description: field.description,
        type: field.type,
        ownerType: "SHOP",
        access: {
          storefront: "PUBLIC_READ",
        },
      },
    },
  });
  const payload = await response.json();
  const userErrors = payload?.data?.metafieldDefinitionCreate?.userErrors ?? [];
  const created = payload?.data?.metafieldDefinitionCreate?.createdDefinition;
  if (created?.id) return { ok: true };
  if (!payload?.errors?.length && definitionAlreadyExists(userErrors)) {
    return { ok: true };
  }

  const message = userErrors.length
    ? userErrorText(userErrors)
    : "The shop fields could not be prepared.";
  console.error("ece metafield definition failed", message);
  return { ok: false, error: message };
}

function emptyRouteBook(shopId) {
  return {
    shopId,
    rules: [],
    rulesError: "Country rules could not be loaded from this shop.",
    marketsRoutingOn: true,
    marketsRoutingMissing: false,
  };
}

function marketsRoutingState(value) {
  const missing = value == null || String(value).trim() === "";
  return {
    marketsRoutingOn: isMarketsRoutingOn(value),
    marketsRoutingMissing: missing,
  };
}

async function saveShopFields(admin, metafields) {
  try {
    const response = await admin.graphql(SAVE_ROUTE_BOOK, {
      variables: { metafields },
    });
    const payload = await response.json();
    const userErrors = payload?.data?.metafieldsSet?.userErrors ?? [];
    if (payload?.errors?.length || userErrors.length) {
      const message = userErrors.length
        ? userErrorText(userErrors)
        : "The shop could not be updated.";
      console.error("ece route book write failed", message);
      return { ok: false, error: message };
    }
    return { ok: true };
  } catch (error) {
    console.error(
      "ece route book write failed",
      error?.message || "unknown error",
    );
    return { ok: false, error: "The shop could not be updated." };
  }
}

function metafieldInput(ownerId, key, value) {
  return {
    ownerId,
    namespace: ECE_METAFIELD_NAMESPACE,
    key,
    type: "json",
    value: JSON.stringify(value),
  };
}

function definitionAlreadyExists(userErrors) {
  return (
    userErrors.length > 0 &&
    userErrors.every(
      (error) =>
        error?.code === "TAKEN" ||
        /already exists|already been taken|in use/i.test(error?.message || ""),
    )
  );
}

function userErrorText(userErrors) {
  const message = userErrors
    .map((error) => error?.message)
    .filter(Boolean)
    .join(" ");
  return message || "The shop could not be updated.";
}

function graphqlErrorText(errors) {
  return errors
    .map((error) => error?.message)
    .filter(Boolean)
    .join(" ");
}
