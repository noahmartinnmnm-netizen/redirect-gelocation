import { ECE_METAFIELD_NAMESPACE } from "../components/ece/eceRuleModel";
import {
  ECE_POPUP_DESIGN_KEY,
  normalizePopupDesign,
  parseStoredPopupDesign,
  popupDesignDocument,
} from "../components/ece/ecePopupDesigns";

const POPUP_DESIGN_QUERY = `#graphql
  query EcePopupDesign($namespace: String!, $key: String!) {
    shop {
      id
      popupDesign: metafield(namespace: $namespace, key: $key) {
        value
      }
    }
  }
`;

const LIST_DEFINITIONS = `#graphql
  query EcePopupDesignDefinitions($namespace: String!) {
    metafieldDefinitions(first: 25, ownerType: SHOP, namespace: $namespace) {
      nodes {
        key
      }
    }
  }
`;

const CREATE_DEFINITION = `#graphql
  mutation EceCreatePopupDesignField($definition: MetafieldDefinitionInput!) {
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

const SAVE_POPUP_DESIGN = `#graphql
  mutation EceSavePopupDesign($metafields: [MetafieldsSetInput!]!) {
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

const definedShops = new Set();

export async function loadEcePopupDesign(admin) {
  try {
    const response = await admin.graphql(POPUP_DESIGN_QUERY, {
      variables: {
        namespace: ECE_METAFIELD_NAMESPACE,
        key: ECE_POPUP_DESIGN_KEY,
      },
    });
    const payload = await response.json();
    if (payload?.errors?.length) {
      console.error(
        "ece popup design query failed",
        graphqlErrorText(payload.errors),
      );
      return {
        shopId: null,
        design: null,
        error: "The popup design could not be loaded.",
      };
    }

    const shop = payload?.data?.shop;
    if (!shop?.id) {
      return {
        shopId: null,
        design: null,
        error: "The popup design could not be loaded.",
      };
    }

    const parsed = parseStoredPopupDesign(shop.popupDesign?.value ?? null);
    if (!parsed.ok) {
      return { shopId: shop.id, design: null, error: parsed.error };
    }
    return { shopId: shop.id, design: parsed.design, error: null };
  } catch (error) {
    console.error(
      "ece popup design query failed",
      error?.message || "unknown error",
    );
    return {
      shopId: null,
      design: null,
      error: "The popup design could not be loaded.",
    };
  }
}

export async function saveEcePopupDesign(admin, input) {
  const normalized = normalizePopupDesign(input);
  if (!normalized.ok) return { ok: false, error: normalized.error };

  const document = popupDesignDocument(normalized.design, new Date().toISOString());
  if (!document) {
    return { ok: false, error: "The popup design could not be saved." };
  }

  const loaded = await loadEcePopupDesign(admin);
  if (!loaded.shopId) {
    return {
      ok: false,
      error: loaded.error || "The popup design could not be saved.",
    };
  }

  const ready = await ensurePopupDesignDefinition(admin, loaded.shopId);
  if (!ready.ok) return ready;

  const saved = await writePopupDesign(admin, loaded.shopId, document);
  if (!saved.ok) return saved;
  return { ok: true, design: document };
}

async function ensurePopupDesignDefinition(admin, shopId) {
  if (definedShops.has(shopId)) return { ok: true };

  try {
    const response = await admin.graphql(LIST_DEFINITIONS, {
      variables: { namespace: ECE_METAFIELD_NAMESPACE },
    });
    const payload = await response.json();
    if (payload?.errors?.length) {
      console.error(
        "ece popup design definition failed",
        graphqlErrorText(payload.errors),
      );
      return { ok: false, error: "The shop field could not be prepared." };
    }

    const existing = new Set(
      (payload?.data?.metafieldDefinitions?.nodes ?? []).map((node) => node.key),
    );
    if (!existing.has(ECE_POPUP_DESIGN_KEY)) {
      const created = await createPopupDesignField(admin);
      if (!created.ok) return created;
    }

    definedShops.add(shopId);
    return { ok: true };
  } catch (error) {
    console.error(
      "ece popup design definition failed",
      error?.message || "unknown error",
    );
    return { ok: false, error: "The shop field could not be prepared." };
  }
}

async function createPopupDesignField(admin) {
  const response = await admin.graphql(CREATE_DEFINITION, {
    variables: {
      definition: {
        name: "Popup design",
        namespace: ECE_METAFIELD_NAMESPACE,
        key: ECE_POPUP_DESIGN_KEY,
        description:
          "Published popup design. Storefront liquid reads shop.metafields.ece.pd_desgine.",
        type: "json",
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
  console.error("ece popup design definition failed", message);
  return { ok: false, error: message };
}

async function writePopupDesign(admin, shopId, document) {
  try {
    const response = await admin.graphql(SAVE_POPUP_DESIGN, {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: ECE_METAFIELD_NAMESPACE,
            key: ECE_POPUP_DESIGN_KEY,
            type: "json",
            value: JSON.stringify(document),
          },
        ],
      },
    });
    const payload = await response.json();
    const userErrors = payload?.data?.metafieldsSet?.userErrors ?? [];
    if (payload?.errors?.length || userErrors.length) {
      const message = userErrors.length
        ? userErrorText(userErrors)
        : "The popup design could not be saved.";
      console.error("ece popup design write failed", message);
      return { ok: false, error: message };
    }
    return { ok: true };
  } catch (error) {
    console.error(
      "ece popup design write failed",
      error?.message || "unknown error",
    );
    return { ok: false, error: "The popup design could not be saved." };
  }
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
  return message || "The popup design could not be saved.";
}

function graphqlErrorText(errors) {
  return errors
    .map((error) => error?.message)
    .filter(Boolean)
    .join(" ");
}
