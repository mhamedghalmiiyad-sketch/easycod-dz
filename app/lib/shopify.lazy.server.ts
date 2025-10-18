/**
 * Lazy loader for Shopify authenticate function
 * This ensures environment variables are available when the function is called
 */
import prisma from "../db.server";

let cachedAuthenticate: any = null;

/**
 * Get the Shopify authenticate function
 * This is called inside route loaders to ensure env vars are available
 */
export async function getAuthenticate() {
  // Return cached if already initialized
  if (cachedAuthenticate) {
    return cachedAuthenticate;
  }

  try {
    // Import the Shopify instance factory
    const { getShopifyInstance } = await import("../shopify.server");
    
    // Get the Shopify app instance (passes Prisma for session storage)
    const shopifyApp = await getShopifyInstance(prisma);
    
    // Cache and return the authenticate function
    cachedAuthenticate = shopifyApp.authenticate;
    
    console.log("✅ Shopify authenticate function loaded");
    return cachedAuthenticate;
  } catch (error) {
    console.error("❌ Failed to load Shopify authenticate:", error);
    throw new Error(
      `Shopify initialization failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
