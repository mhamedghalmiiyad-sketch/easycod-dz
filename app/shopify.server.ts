// ✅ CRITICAL FIX: Use dynamic imports to prevent build-time execution
let shopifyAppModule: any = null;
let PrismaSessionStorageModule: any = null;
let restResourcesModule: any = null;
let dbModule: any = null;

// Lazy initialization pattern to ensure env vars are available at runtime
let cachedShopifyApp: any = null;

async function getShopifyApp() {
  // If already initialized, return cached instance
  if (cachedShopifyApp) {
    return cachedShopifyApp;
  }

  // Dynamic imports to prevent build-time execution
  if (!shopifyAppModule) {
    await import("@shopify/shopify-app-remix/adapters/node");
    shopifyAppModule = await import("@shopify/shopify-app-remix/server");
    PrismaSessionStorageModule = await import("@shopify/shopify-app-session-storage-prisma");
    restResourcesModule = await import("@shopify/shopify-api/rest/admin/2024-07");
    dbModule = await import("./db.server");
  }

  // Get environment variables at runtime (not module load time)
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  const appUrl = process.env.SHOPIFY_APP_URL || 'https://easycod-dz-1.onrender.com';
  const scopes = process.env.SCOPES;
  const sessionSecret = process.env.SESSION_SECRET;

  // Validate that all required variables are present
  if (!apiKey) {
    throw new Error('SHOPIFY_API_KEY environment variable is required');
  }
  if (!apiSecret) {
    throw new Error('SHOPIFY_API_SECRET environment variable is required');
  }
  if (!appUrl) {
    throw new Error('SHOPIFY_APP_URL environment variable is required');
  }
  if (!scopes) {
    throw new Error('SCOPES environment variable is required');
  }
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET environment variable is required');
  }

  // Initialize Shopify app with runtime environment variables
  cachedShopifyApp = shopifyAppModule.shopifyApp({
    apiKey,
    apiSecretKey: apiSecret,
    apiVersion: shopifyAppModule.LATEST_API_VERSION,
    scopes: scopes.split(','),
    appUrl,
    authPathPrefix: "/auth",
    sessionStorage: new PrismaSessionStorageModule.PrismaSessionStorage(dbModule.default),
    distribution: shopifyAppModule.AppDistribution.AppStore,
    restResources: restResourcesModule.restResources,
    webhooks: {
      APP_UNINSTALLED: {
        deliveryMethod: shopifyAppModule.DeliveryMethod.Http,
        callbackUrl: "/webhooks",
      },
    },
    hooks: {
      afterAuth: async ({ session }: any) => {
        const app = await getShopifyApp();
        app.registerWebhooks({ session });
      },
    },
    future: {
      unstable_newEmbeddedAuthStrategy: true,
    },
    ...(process.env.SHOP_CUSTOM_DOMAIN
      ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
      : {}),
  });

  return cachedShopifyApp;
}

// ✅ Export async getters that lazily initialize the app
const shopify = {
  get authenticate() {
    return getShopifyApp().then(app => app.authenticate);
  },
  get unauthenticated() {
    return getShopifyApp().then(app => app.unauthenticated);
  },
  get login() {
    return getShopifyApp().then(app => app.login);
  },
  get registerWebhooks() {
    return getShopifyApp().then(app => app.registerWebhooks);
  },
  get addDocumentResponseHeaders() {
    return getShopifyApp().then(app => (request: Request, responseHeaders: Headers) => {
      return app.addDocumentResponseHeaders(request, responseHeaders);
    });
  },
};

export default shopify;

// ✅ Export async functions for use in routes
export async function getAuthenticate() {
  const app = await getShopifyApp();
  return app.authenticate;
}

export async function getUnauthenticated() {
  const app = await getShopifyApp();
  return app.unauthenticated;
}

export async function getLogin() {
  const app = await getShopifyApp();
  return app.login;
}

export async function getRegisterWebhooks() {
  const app = await getShopifyApp();
  return app.registerWebhooks;
}

export async function getAddDocumentResponseHeaders() {
  const app = await getShopifyApp();
  return app.addDocumentResponseHeaders;
}

// ✅ Export API version as a constant
export const apiVersion = "2024-07";
