/**
 * Environment variable utilities for server-side code
 * Handles environment variable access in both development and production builds
 */

/**
 * Safely get an environment variable from multiple sources
 * @param key - The environment variable key
 * @returns The environment variable value or undefined
 */
export function getEnvVar(key: string): string | undefined {
  // Try global.process.env first (for production builds where env vars are injected)
  if (typeof global !== 'undefined' && global.process && global.process.env && global.process.env[key]) {
    return global.process.env[key];
  }
  // Fall back to regular process.env
  return process.env[key];
}

/**
 * Get a required environment variable, throwing an error if not found
 * @param key - The environment variable key
 * @returns The environment variable value
 * @throws Error if the environment variable is not found
 */
export function getRequiredEnvVar(key: string): string {
  const value = getEnvVar(key);
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get Shopify-specific environment variables
 */
export const shopifyEnv = {
  get apiKey() { return getEnvVar('SHOPIFY_API_KEY'); },
  get apiSecret() { return getEnvVar('SHOPIFY_API_SECRET'); },
  get appUrl() { return getEnvVar('SHOPIFY_APP_URL'); },
  get scopes() { return getEnvVar('SCOPES'); },
  get customDomain() { return getEnvVar('SHOP_CUSTOM_DOMAIN'); },
  get sessionSecret() { return getEnvVar('SESSION_SECRET'); },
  
  // Required getters that throw if not found
  get requiredApiKey() { return getRequiredEnvVar('SHOPIFY_API_KEY'); },
  get requiredApiSecret() { return getRequiredEnvVar('SHOPIFY_API_SECRET'); },
  get requiredAppUrl() { return getRequiredEnvVar('SHOPIFY_APP_URL'); },
  get requiredScopes() { return getRequiredEnvVar('SCOPES'); },
  get requiredSessionSecret() { return getRequiredEnvVar('SESSION_SECRET'); },
};

/**
 * Validate that all required Shopify environment variables are present
 * @throws Error if any required variables are missing
 */
export function validateShopifyEnv(): void {
  const missing: string[] = [];
  
  if (!shopifyEnv.apiKey) missing.push('SHOPIFY_API_KEY');
  if (!shopifyEnv.apiSecret) missing.push('SHOPIFY_API_SECRET');
  if (!shopifyEnv.appUrl) missing.push('SHOPIFY_APP_URL');
  if (!shopifyEnv.scopes) missing.push('SCOPES');
  if (!shopifyEnv.sessionSecret) missing.push('SESSION_SECRET');
  
  if (missing.length > 0) {
    throw new Error(`Missing required Shopify environment variables: ${missing.join(', ')}`);
  }
}
