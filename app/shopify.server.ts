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

// Check if the essential variables are present before starting
if (!shopifyConfig.apiKey || !shopifyConfig.apiSecretKey || !shopifyConfig.appUrl) {
  console.error("Missing essential Shopify environment variables!");
  console.error(`API Key: ${shopifyConfig.apiKey ? 'PRESENT' : 'MISSING'}`);
  console.error(`API Secret Key: ${shopifyConfig.apiSecretKey ? 'PRESENT' : 'MISSING'}`);
  console.error(`App URL: ${shopifyConfig.appUrl ? 'PRESENT' : 'MISSING'}`);
  throw new Error("Missing essential Shopify environment variables! Check your Render config.");
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
