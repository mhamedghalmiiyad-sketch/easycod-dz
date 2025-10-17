// Import the adapter - using dynamic import to prevent build-time execution issues
await import("@shopify/shopify-app-remix/adapters/node");

import {
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
  LATEST_API_VERSION,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-07";
import db from "./db.server";

// Lazy initialization pattern to avoid environment variable validation at import time
let shopifyInstance: ReturnType<typeof shopifyApp> | null = null;

function getShopifyApp() {
  if (!shopifyInstance) {
    // Validate environment variables when the app is first accessed
    // Use more defensive checks to handle build-time scenarios
    const apiKey = process.env.SHOPIFY_API_KEY;
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    const scopes = process.env.SCOPES;
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error("SHOPIFY_API_KEY environment variable is required");
    }
    if (!apiSecret || apiSecret.trim() === '') {
      throw new Error("SHOPIFY_API_SECRET environment variable is required");
    }
    if (!scopes || scopes.trim() === '') {
      throw new Error("SCOPES environment variable is required");
    }

    shopifyInstance = shopifyApp({
      apiKey: apiKey,
      apiSecretKey: apiSecret,
      apiVersion: LATEST_API_VERSION,
      scopes: scopes.split(","),
      appUrl: process.env.SHOPIFY_APP_URL || "https://easycod-dz.onrender.com",
      authPathPrefix: "/auth",
      sessionStorage: new PrismaSessionStorage(db),
      distribution: AppDistribution.AppStore,
      restResources,
      webhooks: {
        APP_UNINSTALLED: {
          deliveryMethod: DeliveryMethod.Http,
          callbackUrl: "/webhooks",
        },
      },
      hooks: {
        afterAuth: async ({ session }) => {
          getShopifyApp().registerWebhooks({ session });
        },
      },
      future: {
        unstable_newEmbeddedAuthStrategy: true,
      },
      ...(process.env.SHOP_CUSTOM_DOMAIN
        ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
        : {}),
    });
  }
  return shopifyInstance;
}

// Export a getter that returns the shopify instance
const shopify = {
  get authenticate() {
    return getShopifyApp().authenticate;
  },
  get unauthenticated() {
    return getShopifyApp().unauthenticated;
  },
  get login() {
    return getShopifyApp().login;
  },
  get registerWebhooks() {
    return getShopifyApp().registerWebhooks;
  },
  get addDocumentResponseHeaders() {
    return getShopifyApp().addDocumentResponseHeaders;
  },
};

export default shopify;
export const apiVersion = LATEST_API_VERSION;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
