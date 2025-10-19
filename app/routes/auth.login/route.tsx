// app/routes/auth.login/route.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";
import { login } from "~/shopify.server"; // Use the login function from our shopify.server

/**
 * This route is dedicated *only* to initiating the Shopify OAuth flow
 * when App Bridge redirects here because no session exists.
 * It should handle the GET request from App Bridge.
 */
export const loader = async (args: LoaderFunctionArgs) => {
  console.log("--- DEBUG: /auth/login loader triggered ---");
  // The login function (from shopify.server) initializes the app context
  // and then calls the library's login, which handles extracting the shop
  // parameter from the URL and initiating the OAuth redirect.
  try {
      await login(args);
  } catch(error) {
      console.error("--- ERROR in /auth/login loader calling login(args) ---", error);
      // Re-throw the error so Remix can handle it
      throw error;
  }

  // This return is technically unreachable because login() causes a redirect.
  return null;
};

// Removed the action function as it's not typically used by the App Bridge redirect.