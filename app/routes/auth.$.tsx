import { LoaderFunctionArgs } from "@remix-run/node";
import { getAuthenticate } from "../lib/shopify.lazy.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // This is the key part: authenticate.admin(request) will handle the
  // top-level redirect to the Shopify login page outside the iframe.
  const authenticate = await getAuthenticate();
  await authenticate.admin(request);

  // This return is never reached, but is required by Remix.
  return null;
};
