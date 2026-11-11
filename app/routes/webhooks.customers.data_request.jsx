import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // This app does not store customer personal data. Acknowledge receipt so
  // Shopify's compliance checks and merchant data-request flow succeed.
  return new Response();
};
