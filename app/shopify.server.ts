import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { db } from "./db.server";  // ✅ fixed import
import { shopifyEnv, validateShopifyEnv } from "./utils/env.server";

// --- START: EXPLICIT CONFIGURATION WITH DEBUGGING ---

// Function to get environment variables (lazy evaluation)
function getShopifyConfig() {
  // CRITICAL: Log environment variables at runtime, not build time
  console.log("--- Initializing Shopify App with Config ---");
  
  console.log("Raw environment variables:");
  console.log(`process.env.SHOPIFY_API_KEY: ${shopifyEnv.apiKey}`);
  console.log(`process.env.SHOPIFY_API_SECRET: ${shopifyEnv.apiSecret}`);
  console.log(`process.env.SHOPIFY_APP_URL: ${shopifyEnv.appUrl}`);
  console.log(`process.env.SCOPES: ${shopifyEnv.scopes}`);
  
  // Manually construct the configuration object from environment variables
  const shopifyConfig = {
    apiKey: shopifyEnv.apiKey,
    apiSecretKey: shopifyEnv.apiSecret || "",
    apiVersion: ApiVersion.January25,
    scopes: shopifyEnv.scopes?.split(","),
    appUrl: shopifyEnv.appUrl || "",
    authPathPrefix: "/auth",
    sessionStorage: new PrismaSessionStorage(db),  // ✅ fixed here
    distribution: AppDistribution.AppStore,
    future: {
      unstable_newEmbeddedAuthStrategy: true,
      removeRest: true,
    },
    ...(shopifyEnv.customDomain
      ? { customShopDomains: [shopifyEnv.customDomain] }
      : {}),
  };
  
  console.log("Processed config:");
  console.log(`API Key: ${shopifyConfig.apiKey}`);
  console.log(`API Secret Key: ${shopifyConfig.apiSecretKey ? '[PRESENT]' : '[MISSING]'}`);
  console.log(`App URL: ${shopifyConfig.appUrl}`);
  console.log(`Scopes: ${shopifyConfig.scopes?.join(', ') || '[MISSING]'}`);
  console.log(`Custom Domain: ${shopifyEnv.customDomain || '[NOT SET]'}`);
  console.log(`Session Secret: ${shopifyEnv.sessionSecret ? '[PRESENT]' : '[MISSING]'}`);
  console.log("✅ Shopify session storage initialized with PrismaSessionStorage");
  console.log("-----------------------------------------");
  
  return shopifyConfig;
}

// Get the configuration (lazy evaluation)
const shopifyConfig = getShopifyConfig();

// Comprehensive validation of essential variables
try {
  validateShopifyEnv();
} catch (error) {
  console.error("❌ Missing essential Shopify environment variables:");
  console.error("\n🔧 To fix this:");
  console.error("1. Go to your Render service dashboard");
  console.error("2. Navigate to the 'Environment' tab");
  console.error("3. Add the missing environment variables");
  console.error("4. Redeploy your service");
  console.error("\n📋 Required variables:");
  console.error("  - SHOPIFY_API_KEY: Your Shopify app's API key");
  console.error("  - SHOPIFY_API_SECRET: Your Shopify app's API secret");
  console.error("  - SHOPIFY_APP_URL: Your app's URL (e.g., https://your-app.onrender.com)");
  console.error("  - SCOPES: Comma-separated list of Shopify scopes");
  throw error;
}

const shopify = shopifyApp({
  ...shopifyConfig,
  useSecureCookies: true, // ✅ Force secure cookies for Render HTTPS
  hooks: {
    afterAuth: async ({ session }) => {
      console.log("✅ Shopify session saved:", session.id, "for shop:", session.shop);
    },
  },
});

console.log("✅ Secure cookie configuration enabled for Render HTTPS");

// --- END: EXPLICIT CONFIGURATION WITH DEBUGGING ---

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
