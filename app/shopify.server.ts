// ✅ FACTORY PATTERN: Use Prisma as context carrier to ensure lazy initialization
let shopifyAppModule: any = null;
let PrismaSessionStorageModule: any = null;
let restResourcesModule: any = null;

// Cache instances by Prisma instance to avoid re-initialization
const shopifyInstances = new WeakMap();

/**
 * Factory function to create Shopify app instance
 * Uses Prisma as a context carrier to ensure environment variables are available
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
    ...(process.env.SHOP_CUSTOM_DOMAIN
      ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
      : {}),
  });

  // Cache the instance
  shopifyInstances.set(prisma, shopifyApp);
  return shopifyApp;
}

// ✅ Export API version as a constant
export const apiVersion = "2024-07";
