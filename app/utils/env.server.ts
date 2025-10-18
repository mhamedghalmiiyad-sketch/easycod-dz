/**
 * Environment variable utilities for server-side code.
 * This version uses a custom global object set by server.js to ensure
 * variables are available in any runtime context (e.g., Render).
 */

// Define the shape of our custom global object
declare global {
  var SHOPIFY_ENV_VARS: { [key: string]: string | undefined };
}

/**
 * Safely get an environment variable.
 * It first checks the custom global object, then falls back to process.env.
 * @param key - The environment variable key
 * @returns The environment variable value or undefined
 */
export function getEnvVar(key: string): string | undefined {
  // 1. Prioritize the custom global object set by server.js
  if (typeof global !== 'undefined' && global.SHOPIFY_ENV_VARS && global.SHOPIFY_ENV_VARS[key]) {
    return global.SHOPIFY_ENV_VARS[key];
  }
  
  // 2. Fallback to standard process.env (for local dev)
  return process.env[key];
}

/**
 * Get a required environment variable, throwing an error if not found.
 * @param key - The environment variable key
 * @returns The environment variable value
 * @throws Error if the environment variable is not found
 */
export function getRequiredEnvVar(key: string): string {
  const value = getEnvVar(key);
  if (value === undefined || value === null || value === "") {
    console.error(`FATAL: Required environment variable ${key} is not set or empty.`);
    throw new Error(`Required environment variable ${key} is not set.`);
  }
  return value;
}

/**
 * Get Shopify-specific environment variables.
 */
export const shopifyEnv = {
  get apiKey() { return getEnvVar('SHOPIFY_API_KEY'); },
  get apiSecret() { return getEnvVar('SHOPIFY_API_SECRET'); },
  get appUrl() { return getEnvVar('SHOPIFY_APP_URL'); },
  get scopes() { return getEnvVar('SCOPES'); },
  get sessionSecret() { return getEnvVar('SESSION_SECRET'); },
  
  // Required getters that throw if not found
  get requiredApiKey() { return getRequiredEnvVar('SHOPIFY_API_KEY'); },
  get requiredApiSecret() { return getRequiredEnvVar('SHOPIFY_API_SECRET'); },
  get requiredAppUrl() { return getRequiredEnvVar('SHOPIFY_APP_URL'); },
  get requiredScopes() { return getRequiredEnvVar('SCOPES'); },
  get requiredSessionSecret() { return getRequiredEnvVar('SESSION_SECRET'); },
};