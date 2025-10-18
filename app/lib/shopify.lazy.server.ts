// app/lib/shopify.lazy.server.ts
// Lazy loader for Shopify app initialization to prevent build-time environment variable issues

export async function getShopifyInstance() {
  try {
    const { default: shopify } = await import("../shopify.server");
    return shopify;
  } catch (error) {
    console.error("Failed to load Shopify instance:", error);
    throw error;
  }
}

// Convenience functions for common Shopify operations
export async function getAuthenticate() {
  const shopify = await getShopifyInstance();
  return await shopify.authenticate;
}

export async function getUnauthenticated() {
  const shopify = await getShopifyInstance();
  return await shopify.unauthenticated;
}

export async function getLogin() {
  const shopify = await getShopifyInstance();
  return await shopify.login;
}

export async function getRegisterWebhooks() {
  const shopify = await getShopifyInstance();
  return await shopify.registerWebhooks;
}

export async function getAddDocumentResponseHeaders() {
  const shopify = await getShopifyInstance();
  return await shopify.addDocumentResponseHeaders;
}
