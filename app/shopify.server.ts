import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { db } from "./db.server";  // ✅ fixed import

// --- START: EXPLICIT CONFIGURATION WITH DEBUGGING ---

// Manually construct the configuration object from environment variables
const shopifyConfig = {
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(db),  // ✅ fixed here
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
};

// CRITICAL DEBUGGING STEP: Log the values to see what the app sees
console.log("--- Initializing Shopify App with Config ---");
console.log("Raw environment variables:");
console.log(`process.env.SHOPIFY_API_KEY: ${process.env.SHOPIFY_API_KEY}`);
console.log(`process.env.SHOPIFY_API_SECRET: ${process.env.SHOPIFY_API_SECRET}`);
console.log(`process.env.SHOPIFY_APP_URL: ${process.env.SHOPIFY_APP_URL}`);
console.log(`process.env.SCOPES: ${process.env.SCOPES}`);
console.log("Processed config:");
console.log(`API Key: ${shopifyConfig.apiKey}`);
console.log(`API Secret Key: ${shopifyConfig.apiSecretKey ? '[PRESENT]' : '[MISSING]'}`);
console.log(`App URL: ${shopifyConfig.appUrl}`);
console.log(`Scopes: ${shopifyConfig.scopes?.join(', ') || '[MISSING]'}`);
console.log(`Custom Domain: ${process.env.SHOP_CUSTOM_DOMAIN || '[NOT SET]'}`);
console.log("-----------------------------------------");

// Comprehensive validation of essential variables
const validationErrors = [];
if (!shopifyConfig.apiKey) validationErrors.push('SHOPIFY_API_KEY');
if (!shopifyConfig.apiSecretKey) validationErrors.push('SHOPIFY_API_SECRET');
if (!shopifyConfig.appUrl) validationErrors.push('SHOPIFY_APP_URL');
if (!shopifyConfig.scopes || shopifyConfig.scopes.length === 0) validationErrors.push('SCOPES');

if (validationErrors.length > 0) {
  console.error("❌ Missing essential Shopify environment variables:");
  validationErrors.forEach(varName => console.error(`  - ${varName}`));
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
  throw new Error(`Missing essential Shopify environment variables: ${validationErrors.join(', ')}`);
}

const shopify = shopifyApp(shopifyConfig);

// --- END: EXPLICIT CONFIGURATION WITH DEBUGGING ---

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
