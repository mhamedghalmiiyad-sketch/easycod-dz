import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { login, authenticate } from "~/shopify.server";
import { shopifyEnv } from "~/utils/env.server";

/**
 * This route is dedicated to initiating the Shopify login flow.
 * For embedded apps with Shopify-managed installations, this will use token exchange.
 * For non-embedded apps or when Shopify-managed installations are not enabled,
 * this will use the traditional OAuth flow.
 */

// This function handles GET requests to /auth/login
export const loader = async (args: LoaderFunctionArgs) => {
  try {
    // For embedded apps with Shopify-managed installations, try token exchange first
    const { session } = await authenticate.admin(args);
    
    if (session) {
      // Token exchange successful, redirect to app
      return json({ success: true, session });
    }
  } catch (error) {
    // If token exchange fails, fall back to traditional OAuth flow
    console.log("Token exchange failed, falling back to OAuth:", error);
  }
  
  // Fallback to traditional OAuth flow
  await login(args);
  
  // This return is technically unreachable because login() causes a redirect.
  // It's included to satisfy TypeScript's requirement that loaders return a Response.
  return null;
};

// This function handles POST requests to /auth/login, often from the app's own login form
export const action = async (args: ActionFunctionArgs) => {
  try {
    // For embedded apps with Shopify-managed installations, try token exchange first
    const { session } = await authenticate.admin(args);
    
    if (session) {
      // Token exchange successful, redirect to app
      return json({ success: true, session });
    }
  } catch (error) {
    // If token exchange fails, fall back to traditional OAuth flow
    console.log("Token exchange failed, falling back to OAuth:", error);
  }
  
  // Fallback to traditional OAuth flow
  await login(args);
  return null;
};