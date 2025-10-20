import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * This is a required route for the new embedded authentication strategy.
 * It's called by the Shopify library's authenticate.admin function to
 * validate the session token.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("--- DEBUG: /auth/session-token action triggered ---");
  // This function will validate the session token passed in the request headers
  // and throw an error if it's invalid.
  await authenticate.sessionToken(request);

  // If it doesn't throw, the token is valid.
  return json({ success: true });
};
