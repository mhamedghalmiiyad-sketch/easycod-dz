import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { login } from "~/shopify.server";

/**
 * This route is dedicated to initiating the Shopify login flow.
 * With the new auth strategy, the `login()` function handles everything:
 * 1. It will first attempt a token exchange.
 * 2. If that fails (or isn't applicable), it will fall back to the
 * traditional OAuth redirect flow.
 *
 * This file should NOT call `authenticate.admin`.
 */

// This function handles GET requests to /auth/login
export const loader = async (args: LoaderFunctionArgs) => {
  // The login function will handle everything: token exchange or OAuth redirect.
  await login(args);
  
  // This return is technically unreachable, but required by Remix.
  return null;
};

// This function handles POST requests to /auth/login
export const action = async (args: ActionFunctionArgs) => {
  await login(args);
  return null;
};