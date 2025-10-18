import { authenticate } from '../shopify.server';

/**
 * Lazy-loaded authentication function for server-side code
 * This allows for dynamic imports to avoid bundling issues
 */
export const getAuthenticate = async () => {
  return authenticate;
};
