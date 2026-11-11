import { ECE_METAFIELD_NAMESPACE } from "../components/ece/eceRuleModel";
import {
  ECE_COUNTRY_BLOCKER_KEY,
  ECE_COUNTRY_BLOCKER_NAME,
  ECE_WHITELISTED_IPS_KEY,
  applyBlockerPatch,
  countryBlockerDocument,
  parseStoredCountryBlocker,
  parseStoredWhitelist,
} from "../components/ece/eceCountryBlocker";

const BLOCKER_QUERY = `#graphql
  query EceCountryBlocker($namespace: String!, $key: String!, $whitelistKey: String!) {
    shop {
      id
      blocker: metafield(namespace: $namespace, key: $key) {
        value
      }
      whitelist: metafield(namespace: $namespace, key: $whitelistKey) {
        value
      }
    }
  }
`;

const LIST_DEFINITIONS = `#graphql
  query EceCountryBlockerDefinitions($namespace: String!) {
    metafieldDefinitions(first: 50, ownerType: SHOP, namespace: $namespace) {
      nodes {
        key
      }
    }
  }
`;

const CREATE_DEFINITION = `#graphql
  mutation EceCreateCountryBlockerField($definition: MetafieldDefinitionInput!) {
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

const SAVE_BLOCKER = `#graphql
  mutation EceSaveCountryBlocker($metafields: [MetafieldsSetInput!]!) {
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
    name: ECE_COUNTRY_BLOCKER_NAME,
    key: ECE_COUNTRY_BLOCKER_KEY,
    description:
      "Published country blocker. Storefront liquid reads shop.metafields.ece.ece_country_blocker.",
    type: "json",
  },
  {
    name: "Whitelisted IPs",
    key: ECE_WHITELISTED_IPS_KEY,
    description:
      "IP addresses that skip country blocking and redirection. The country blocker and the other embeds share this list.",
    type: "json",
  },
];

const definedShops = new Set();

export async function loadEceCountryBlocker(admin) {
  try {
    const response = await admin.graphql(BLOCKER_QUERY, {
      variables: {
        namespace: ECE_METAFIELD_NAMESPACE,
        key: ECE_COUNTRY_BLOCKER_KEY,
        whitelistKey: ECE_WHITELISTED_IPS_KEY,
      },
    });
    const payload = await response.json();
    if (payload?.errors?.length) {
      console.error(
        "ece country blocker query failed",
        graphqlErrorText(payload.errors),
      );
      return {
        shopId: null,
        blocker: null,
        error: "The country blocker could not be loaded.",
      };
    }

    const shop = payload?.data?.shop;
    if (!shop?.id) {
      return {
        shopId: null,
        blocker: null,
        error: "The country blocker could not be loaded.",
      };
    }

    const parsed = parseStoredCountryBlocker(shop.blocker?.value ?? null);
    if (!parsed.ok) {
      return { shopId: shop.id, blocker: null, error: parsed.error };
    }

    const sharedWhitelist = parseStoredWhitelist(shop.whitelist?.value ?? null);
    if (!parsed.blocker) {
      if (!sharedWhitelist) return { shopId: shop.id, blocker: null, error: null };
      return {
        shopId: shop.id,
        blocker: {
          design: null,
          blockedCountries: [],
          blockedIps: [],
          blockedIpRanges: [],
          whitelistedIps: sharedWhitelist,
        },
        error: null,
      };
    }

    if (sharedWhitelist) {
      parsed.blocker.whitelistedIps = sharedWhitelist;
    }
    return { shopId: shop.id, blocker: parsed.blocker, error: null };
  } catch (error) {
    console.error(
      "ece country blocker query failed",
      error?.message || "unknown error",
    );
    return {
      shopId: null,
      blocker: null,
      error: "The country blocker could not be loaded.",
    };
  }
}

export async function saveEceCountryBlocker(admin, patch) {
  const loaded = await loadEceCountryBlocker(admin);
  if (!loaded.shopId) {
    return {
      ok: false,
      error: loaded.error || "The country blocker could not be saved.",
    };
  }

  const next = applyBlockerPatch(loaded.blocker, patch);
  if (!next.ok) return next;

  const document = countryBlockerDocument(next.blocker, new Date().toISOString());
  if (!document) {
    return { ok: false, error: "The country blocker could not be saved." };
  }

  const ready = await ensureBlockerDefinitions(admin, loaded.shopId);
  if (!ready.ok) return ready;

  const saved = await writeBlocker(admin, loaded.shopId, document);
  if (!saved.ok) return saved;
  return { ok: true, blocker: next.blocker };
}

async function ensureBlockerDefinitions(admin, shopId) {
  if (definedShops.has(shopId)) return { ok: true };

  try {
    const response = await admin.graphql(LIST_DEFINITIONS, {
      variables: { namespace: ECE_METAFIELD_NAMESPACE },
    });
    const payload = await response.json();
    if (payload?.errors?.length) {
      console.error(
        "ece country blocker definition failed",
        graphqlErrorText(payload.errors),
      );
      return { ok: false, error: "The shop field could not be prepared." };
    }

    const existing = new Set(
      (payload?.data?.metafieldDefinitions?.nodes ?? []).map((node) => node.key),
    );
    for (const field of FIELD_DEFINITIONS) {
      if (existing.has(field.key)) continue;
      const created = await createBlockerField(admin, field);
      if (!created.ok) return created;
    }

    definedShops.add(shopId);
    return { ok: true };
  } catch (error) {
    console.error(
      "ece country blocker definition failed",
      error?.message || "unknown error",
    );
    return { ok: false, error: "The shop field could not be prepared." };
  }
}

async function createBlockerField(admin, field) {
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
    : "The shop field could not be prepared.";
  console.error("ece country blocker definition failed", message);
  return { ok: false, error: message };
}

async function writeBlocker(admin, shopId, document) {
  try {
    const response = await admin.graphql(SAVE_BLOCKER, {
      variables: {
        metafields: [
          metafieldInput(shopId, ECE_COUNTRY_BLOCKER_KEY, document),
          metafieldInput(shopId, ECE_WHITELISTED_IPS_KEY, document.whitelistedIps),
        ],
      },
    });
    const payload = await response.json();
    const userErrors = payload?.data?.metafieldsSet?.userErrors ?? [];
    if (payload?.errors?.length || userErrors.length) {
      const message = userErrors.length
        ? userErrorText(userErrors)
        : "The country blocker could not be saved.";
      console.error("ece country blocker write failed", message);
      return { ok: false, error: message };
    }
    return { ok: true };
  } catch (error) {
    console.error(
      "ece country blocker write failed",
      error?.message || "unknown error",
    );
    return { ok: false, error: "The country blocker could not be saved." };
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
  return message || "The country blocker could not be saved.";
}

function graphqlErrorText(errors) {
  return errors
    .map((error) => error?.message)
    .filter(Boolean)
    .join(" ");
}
