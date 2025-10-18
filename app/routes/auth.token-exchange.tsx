import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

/**
 * Token exchange route for Shopify-managed installations
 * This route handles the token exchange flow for embedded apps
 * when using Shopify-managed installations.
 */
export const action = async (args: ActionFunctionArgs) => {
  try {
    // Use the authenticate function to handle token exchange
    const { session } = await authenticate.admin(args);
    
    if (!session) {
      return json({ error: "Authentication failed" }, { status: 401 });
    }

    // Return success response with session information
    return json({ 
      success: true, 
      shop: session.shop,
      accessToken: session.accessToken 
    });
  } catch (error) {
    console.error("Token exchange error:", error);
    return json({ 
      error: "Token exchange failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
};

// Handle GET requests (though token exchange is typically POST)
export const loader = async (args: ActionFunctionArgs) => {
  return action(args);
};
