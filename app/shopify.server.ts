import type { LoaderFunctionArgs, ActionFunctionArgs, AppLoadContext } from "@remix-run/node";
import { shopifyApp } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-07";
import prisma from "~/db.server";

// --- THIS IS THE FIX ---
// The shopifyApp instance is now created on-demand for each request.
const initializeShopifyApp = (context: AppLoadContext) => {
  // Read the env variables from the context injected by server.js
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
    // --- THIS IS THE FIX ---
    // Enable the future flag required for the new token exchange strategy.
    future: {
      unstable_newEmbeddedAuthStrategy: true,
    },
    // --- END OF FIX ---
  });
};

// We create a new authenticate object with methods that accept the full loader arguments.
export const authenticate = {
  admin: async (args: LoaderFunctionArgs | ActionFunctionArgs) => {
    const shopify = initializeShopifyApp(args.context);
    return await shopify.authenticate.admin(args.request);
  },
};

// --- THIS IS THE FIX ---
// We re-export the login function using the new per-request pattern.
// It now also needs the 'context' to initialize correctly.
export const login = async (args: LoaderFunctionArgs | ActionFunctionArgs) => {
  const shopify = initializeShopifyApp(args.context);
  return await shopify.login(args.request);
};

// Export other required functions using the new pattern
export const unauthenticated = {
  admin: async (shop: string) => {
    // For unauthenticated admin, we need to create a shopify instance
    // but we don't have context here, so we'll need to get env vars differently
    const env = {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
      SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
      SCOPES: process.env.SCOPES,
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
    };

    if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET || !env.SCOPES || !env.SHOPIFY_APP_URL) {
      throw new Error("Missing Shopify environment variables for unauthenticated admin.");
    }
    
    const shopify = shopifyApp({
      apiKey: env.SHOPIFY_API_KEY,
      apiSecretKey: env.SHOPIFY_API_SECRET,
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

// Helper function to get the shopify instance (for backward compatibility)
export const getShopify = async () => {
  // This is a bit tricky since we don't have context here
  // We'll create a minimal instance for backward compatibility
  const env = {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
    SCOPES: process.env.SCOPES,
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
  };

  if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET || !env.SCOPES || !env.SHOPIFY_APP_URL) {
    throw new Error("Missing Shopify environment variables for getShopify.");
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