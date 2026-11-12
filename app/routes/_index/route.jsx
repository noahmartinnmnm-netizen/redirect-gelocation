import { redirect } from "react-router";

// App home lives at /app. Keep / as a bounce so bare application_url hits
// never show the template shop-domain login page inside admin.
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  throw redirect(`/app?${url.searchParams.toString()}`);
};
