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
  });
};

// We create a new authenticate object with methods that accept the full loader arguments.
export const authenticate = {
  admin: async ({ request, context }: LoaderFunctionArgs | ActionFunctionArgs) => {
    const shopify = initializeShopifyApp(context);
    return await shopify.authenticate.admin(request);
  },
  // You can add public authentication here if needed later
  // public: async ({ request, context }: LoaderFunctionArgs | ActionFunctionArgs) => { ... }
};