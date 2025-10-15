import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // This function handles the OAuth callback from Shopify
  // and redirects the user back to the embedded app in the admin.
  await authenticate.admin(request);

  return null;
};
