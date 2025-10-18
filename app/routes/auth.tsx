/**
 * This route handles the OAuth callback from Shopify
 * After the user authorizes the app on Shopify, they get redirected here
 * 
 * Note: This route should not have a loader that tries to authenticate
 * as it conflicts with the login process. The authentication will be
 * handled by the specific auth routes (like auth.callback).
 */
