// ✅ ENVIRONMENT VARIABLE INJECTION: Fix Render ESM scoping issues
let shopifyAppModule: any = null;
let PrismaSessionStorageModule: any = null;
let restResourcesModule: any = null;

// Cache instances by Prisma instance to avoid re-initialization
const shopifyInstances = new WeakMap();

// Store injected environment variables
let injectedEnv: any = null;

/**
 * Inject environment variables into this module
 * This bypasses Render's ESM scoping issues by passing env vars explicitly
 * @param envVars - Environment variables object
 */
export function injectShopifyEnv(envVars: {
  apiKey: string;
  apiSecret: string;
  appUrl: string;
  scopes: string;
  sessionSecret: string;
  shopCustomDomain?: string;
}) {
  injectedEnv = envVars;
  console.log("✅ Shopify environment variables injected successfully");
}

/**
 * Get environment variables from injection, global scope, or fallback to process.env
 */
function getEnvVars() {
  // Try injected environment variables first (for direct injection)
  if (injectedEnv) {
    return injectedEnv;
  }
  
  // Try global scope (for Render ESM scoping fix)
  if (typeof global !== 'undefined' && (global as any).__SHOPIFY_ENV__) {
    const globalEnv = (global as any).__SHOPIFY_ENV__;
    return {
      apiKey: globalEnv.apiKey,
      apiSecret: globalEnv.apiSecret,
      appUrl: globalEnv.appUrl || 'https://easycod-dz-1.onrender.com',
      scopes: globalEnv.scopes,
      sessionSecret: globalEnv.sessionSecret,
      shopCustomDomain: process.env.SHOP_CUSTOM_DOMAIN, // Still use process.env for optional vars
    };
  }
  
  // Fallback to process.env (for local development)
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  const appUrl = process.env.SHOPIFY_APP_URL || 'https://easycod-dz-1.onrender.com';
  const scopes = process.env.SCOPES;
  const sessionSecret = process.env.SESSION_SECRET;
  const shopCustomDomain = process.env.SHOP_CUSTOM_DOMAIN;
  
  if (!apiKey || !apiSecret || !scopes || !sessionSecret) {
    throw new Error('Environment variables not available - check injection, global scope, or process.env');
  }
  
  return { apiKey, apiSecret, appUrl, scopes, sessionSecret, shopCustomDomain };
}

/**
 * Factory function to create Shopify app instance
 * Uses injected environment variables to bypass Render ESM scoping issues
 * @param prisma - Prisma instance for session storage
 * @returns Shopify app instance
 */
export async function getShopifyInstance(prisma: any) {
  // Return cached instance if available
  if (shopifyInstances.has(prisma)) {
    return shopifyInstances.get(prisma);
  }

  // Dynamic imports to prevent build-time execution
  if (!shopifyAppModule) {
    await import("@shopify/shopify-app-remix/adapters/node");
    shopifyAppModule = await import("@shopify/shopify-app-remix/server");
    PrismaSessionStorageModule = await import("@shopify/shopify-app-session-storage-prisma");
    restResourcesModule = await import("@shopify/shopify-api/rest/admin/2024-07");
  }

  // Get environment variables (injected or from process.env)
  const { apiKey, apiSecret, appUrl, scopes, sessionSecret, shopCustomDomain } = getEnvVars();

  // Initialize Shopify app with environment variables
  const shopifyApp = shopifyAppModule.shopifyApp({
    apiKey,
    apiSecretKey: apiSecret,
    apiVersion: shopifyAppModule.LATEST_API_VERSION,
    scopes: scopes.split(','),
    appUrl,
    authPathPrefix: "/auth",
    sessionStorage: new PrismaSessionStorageModule.PrismaSessionStorage(prisma),
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
        const app = await getShopifyInstance(prisma);
        app.registerWebhooks({ session });
      },
    },
    future: {
      unstable_newEmbeddedAuthStrategy: true,
    },
    ...(shopCustomDomain
      ? { customShopDomains: [shopCustomDomain] }
      : {}),
  });

  // Cache the instance
  shopifyInstances.set(prisma, shopifyApp);
  return shopifyApp;
}

// ✅ Export API version as a constant
export const apiVersion = "2024-07";

// ✅ Export shopify instance for auth routes
export async function getShopify() {
  const { db } = await import("./db.server");
  return await getShopifyInstance(db);
}

// ✅ Export default shopify instance
export default getShopify;