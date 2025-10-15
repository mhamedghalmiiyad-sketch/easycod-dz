import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // This is the key part: authenticate.admin(request) will handle the
  // top-level redirect to the Shopify login page outside the iframe.
  await authenticate.admin(request);

  // This return is never reached, but is required by Remix.
  return null;
};
