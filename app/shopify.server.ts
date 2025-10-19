import type { LoaderFunctionArgs, ActionFunctionArgs, AppLoadContext } from "@remix-run/node";
import { shopifyApp } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-07";
import prisma from "~/db.server";

// Type definition for the global variable
declare global {
  var SHOPIFY_ENV_VARS: {
    SHOPIFY_API_KEY?: string;
    SHOPIFY_API_SECRET?: string;
    SCOPES?: string;
    SHOPIFY_APP_URL?: string;
    SESSION_SECRET?: string;
  };
}

// initializeShopifyApp remains the same (uses context)
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
    future: { unstable_newEmbeddedAuthStrategy: true },
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

// addDocumentResponseHeaders remains the same (uses global)
export const addDocumentResponseHeaders = (
  request: Request,
  headers: Headers,
) => {
  const env = global.SHOPIFY_ENV_VARS || {};
   if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_APP_URL || !env.SHOPIFY_API_SECRET || !env.SCOPES) {
    console.error("Missing Shopify environment variables in global env for setting CSP headers. Headers might be incomplete.");
    return headers;
  }
  const shopify = shopifyApp({
    apiKey: env.SHOPIFY_API_KEY,
    apiSecretKey: env.SHOPIFY_API_SECRET,
    scopes: env.SCOPES.split(","),
    appUrl: env.SHOPIFY_APP_URL,
    isEmbeddedApp: true,
    sessionStorage: new PrismaSessionStorage(prisma),
    restResources,
    useShopifyManagedInstallations: true,
    future: { unstable_newEmbeddedAuthStrategy: true },
  });
  return shopify.addDocumentResponseHeaders(request, headers);
};

// --- THIS IS THE FIXED FUNCTION ---
// It now reads from global.SHOPIFY_ENV_VARS instead of process.env
export const unauthenticated = {
  admin: async (shop: string) => {
    // Read directly from the global variable
    const env = global.SHOPIFY_ENV_VARS || {}; // Use empty object as fallback

    if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET || !env.SCOPES || !env.SHOPIFY_APP_URL) {
      console.error("--- ERROR: Missing Shopify env vars in global for unauthenticated.admin ---", {
          key: !!env.SHOPIFY_API_KEY,
          secret: !!env.SHOPIFY_API_SECRET,
          scopes: !!env.SCOPES,
          url: !!env.SHOPIFY_APP_URL,
      });
      throw new Error("Missing Shopify environment variables for unauthenticated admin.");
    }

    const shopify = shopifyApp({
      apiKey: env.SHOPIFY_API_KEY,
      apiSecretKey: env.SHOPIFY_API_SECRET, // Corrected property name
      scopes: env.SCOPES.split(","),
      appUrl: env.SHOPIFY_APP_URL,
      isEmbeddedApp: true,
      sessionStorage: new PrismaSessionStorage(prisma),
      restResources,
      future: { unstable_newEmbeddedAuthStrategy: true },
    });

    return await shopify.unauthenticated.admin(shop);
  }
};
// --- END OF FIXED FUNCTION ---

// --- UPDATED HELPER FUNCTION ---
// Also update getShopify to use the global variable for consistency
export const getShopify = async () => {
  // Read directly from the global variable
  const env = global.SHOPIFY_ENV_VARS || {}; // Use empty object as fallback

  if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET || !env.SCOPES || !env.SHOPIFY_APP_URL) {
     console.error("--- ERROR: Missing Shopify env vars in global for getShopify ---");
     throw new Error("Missing Shopify environment variables for getShopify.");
  }

  return shopifyApp({
    apiKey: env.SHOPIFY_API_KEY,
    apiSecretKey: env.SHOPIFY_API_SECRET, // Corrected property name
    scopes: env.SCOPES.split(","),
    appUrl: env.SHOPIFY_APP_URL,
    isEmbeddedApp: true,
    sessionStorage: new PrismaSessionStorage(prisma),
    restResources,
    useShopifyManagedInstallations: true,
    future: { unstable_newEmbeddedAuthStrategy: true },
  });
};
// --- END UPDATED HELPER FUNCTION ---