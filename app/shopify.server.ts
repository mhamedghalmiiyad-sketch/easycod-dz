import '@shopify/shopify-app-remix/adapters/node';
import { shopifyApp } from '@shopify/shopify-app-remix/server';
import { PrismaSessionStorage } from '@shopify/shopify-app-session-storage-prisma';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-07';
import prisma from '~/db.server';
import { shopifyEnv } from '~/utils/env.server'; // <--- IMPORT THE FIX

let shopifyInstance: ReturnType<typeof shopifyApp> | null = null;

function getShopifyApp() {
  if (!shopifyInstance) {
    // --- THIS IS THE CHANGE ---
    // We now use shopifyEnv.required... to get the env vars
    // This utility (env.server.ts) is smart enough to find the
    // variables provided by your server.js file.
    shopifyInstance = shopifyApp({
      apiKey: shopifyEnv.requiredApiKey,
      apiSecret: shopifyEnv.requiredApiSecret,
      scopes: shopifyEnv.requiredScopes?.split(','),
      appUrl: shopifyEnv.requiredAppUrl,
      isEmbeddedApp: true,
      sessionStorage: new PrismaSessionStorage(prisma),
      restResources,
    });
    // --- END OF CHANGE ---
  }
  return shopifyInstance;
}

const shopify = new Proxy(
  {},
  {
    get: (_target, prop) => {
      const app = getShopifyApp();
      return app[prop as keyof typeof app];
    },
  }
) as ReturnType<typeof shopifyApp>;

export default shopify;

// Export authentication functions
export const authenticate = new Proxy(
  {},
  {
    get: (_target, prop) => {
      const app = getShopifyApp();
      return app.authenticate[prop as keyof typeof app.authenticate];
    },
  }
) as typeof shopify.authenticate;

export const login = (request: Request) => {
  return getShopifyApp().login(request);
};

export const unauthenticated = (request: Request) => {
  return getShopifyApp().unauthenticated(request);
};

export const registerWebhooks = () => {
  return getShopifyApp().registerWebhooks();
};

export const addDocumentResponseHeaders = (request: Request, response: Response) => {
  return getShopifyApp().addDocumentResponseHeaders(request, response);
};

// Helper function to get the shopify instance
export const getShopify = async () => getShopifyApp();