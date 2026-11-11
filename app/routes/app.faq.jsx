import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { EceFaqPage } from "../components/ece/EceFaqPage";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function FaqPage() {
  return <EceFaqPage />;
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
