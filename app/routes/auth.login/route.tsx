import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { login } from "~/shopify.server";
import { shopifyEnv } from "~/utils/env.server";

/**
 * This route is dedicated to initiating the Shopify login flow.
 * It's called when a merchant clicks "Install" or when an unauthenticated
 * request is made to a protected route.
 */

// This function handles GET requests to /auth/login
export const loader = async (args: LoaderFunctionArgs) => {
  // The login function will redirect the user to the Shopify OAuth page
  await login(args);
  
  // This return is technically unreachable because login() causes a redirect.
  // It's included to satisfy TypeScript's requirement that loaders return a Response.
  return null;
};

// This function handles POST requests to /auth/login, often from the app's own login form
export const action = async (args: ActionFunctionArgs) => {
  await login(args);
  return null;
};