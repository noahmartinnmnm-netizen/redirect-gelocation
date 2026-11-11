import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // 48 hours after uninstall, Shopify asks apps to delete shop data.
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};
