import type { LoaderFunctionArgs, ActionFunctionArgs, AppLoadContext } from "@remix-run/node";
import { shopifyApp } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-07";
import prisma from "~/db.server";

// This function remains the same - used by loaders/actions with context
const initializeShopifyApp = (context: AppLoadContext) => {
  const { shopify: env } = context as { shopify: { SHOPIFY_API_KEY: string; SHOPIFY_API_SECRET: string; SCOPES: string; SHOPIFY_APP_URL: string; SESSION_SECRET: string } };

  if (!env?.SHOPIFY_API_KEY || !env?.SHOPIFY_API_SECRET || !env?.SCOPES || !env?.SHOPIFY_APP_URL) {
    throw new Error("Missing Shopify environment variables in request context.");
  }

  return shopifyApp({
    apiKey: env.SHOPIFY_API_KEY,
    apiSecretKey: env.SHOPIFY_API_SECRET,
    scopes: env.SCOPES.split(","),
    appUrl: env.SHOPIFY_APP_URL,
    isEmbeddedApp: true,
    sessionStorage: new PrismaSessionStorage(prisma),
    restResources,
    useShopifyManagedInstallations: true,
    future: {
      unstable_newEmbeddedAuthStrategy: true,
    },
  });
};

export const authenticate = {
  admin: async (args: LoaderFunctionArgs | ActionFunctionArgs) => {
    const shopify = initializeShopifyApp(args.context);
    return await shopify.authenticate.admin(args.request);
  },
};

export const login = async (args: LoaderFunctionArgs | ActionFunctionArgs) => {
  const shopify = initializeShopifyApp(args.context);
  return await shopify.login(args.request);
};

// --- THIS IS THE FIXED FUNCTION ---
// It no longer accepts `context`. It creates its own minimal Shopify instance
// using process.env because it runs before getLoadContext.
export const addDocumentResponseHeaders = (
  request: Request,
  headers: Headers,
  // context: AppLoadContext // <-- Removed context
) => {
  // Create a minimal Shopify instance using process.env
  const env = {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
    SCOPES: process.env.SCOPES,
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
  };

   if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET || !env.SCOPES || !env.SHOPIFY_APP_URL) {
    // Log an error but don't throw, as headers are secondary to app function
    console.error("Missing Shopify environment variables for setting CSP headers. Headers might be incomplete.");
    return headers; // Return original headers if env vars missing
  }

  const shopify = shopifyApp({
    apiKey: env.SHOPIFY_API_KEY,
    apiSecretKey: env.SHOPIFY_API_SECRET, // Corrected property name
    scopes: env.SCOPES.split(","),
    appUrl: env.SHOPIFY_APP_URL,
    isEmbeddedApp: true,
    sessionStorage: new PrismaSessionStorage(prisma), // Still needed for config
    restResources, // Still needed for config
    // No need for future flag here as it's just for headers
  });

  // Call the original function from the library using the minimal instance
  return shopify.addDocumentResponseHeaders(request, headers);
};
// --- END OF FIXED FUNCTION ---


// Unauthenticated and getShopify helpers remain the same
export const unauthenticated = {
  admin: async (shop: string) => {
    const env = { SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY, SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET, SCOPES: process.env.SCOPES, SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL };
    if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET || !env.SCOPES || !env.SHOPIFY_APP_URL) { throw new Error("Missing Shopify environment variables for unauthenticated admin."); }
    const shopify = shopifyApp({ apiKey: env.SHOPIFY_API_KEY, apiSecretKey: env.SHOPIFY_API_SECRET, scopes: env.SCOPES.split(","), appUrl: env.SHOPIFY_APP_URL, isEmbeddedApp: true, sessionStorage: new PrismaSessionStorage(prisma), restResources, future: { unstable_newEmbeddedAuthStrategy: true }, });
    return await shopify.unauthenticated.admin(shop);
  }
};

export const getShopify = async () => {
  const env = { SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY, SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET, SCOPES: process.env.SCOPES, SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL };
  if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET || !env.SCOPES || !env.SHOPIFY_APP_URL) { throw new Error("Missing Shopify environment variables for getShopify."); }
  return shopifyApp({ apiKey: env.SHOPIFY_API_KEY, apiSecretKey: env.SHOPIFY_API_SECRET, scopes: env.SCOPES.split(","), appUrl: env.SHOPIFY_APP_URL, isEmbeddedApp: true, sessionStorage: new PrismaSessionStorage(prisma), restResources, useShopifyManagedInstallations: true, future: { unstable_newEmbeddedAuthStrategy: true }, });
};