import { LoaderFunctionArgs } from "@remix-run/node";
// Dynamic import to avoid build conflicts

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // This function handles the OAuth callback from Shopify
  // and redirects the user back to the embedded app in the admin.
  const { getAuthenticate } = await import("../lib/shopify.lazy.server");
  const authenticate = await getAuthenticate();
  await authenticate.admin(request);

  return null;
};
