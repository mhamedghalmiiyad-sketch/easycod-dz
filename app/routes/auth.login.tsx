import type { LoaderFunctionArgs } from "@remix-run/node";

/**
 * This route exists solely to serve the initial HTML shell needed by App Bridge
 * when it detects no session and redirects the user here client-side.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("--- DEBUG: /auth/login loader serving App Bridge redirect shell ---");

  // We only need the API Key for the client-side script.
  const apiKey = process.env.SHOPIFY_API_KEY || global.SHOPIFY_ENV_VARS?.SHOPIFY_API_KEY || "";

  if (!apiKey) {
      console.error("FATAL ERROR: Cannot render login shell without SHOPIFY_API_KEY");
      return new Response("Application configuration error.", { status: 500 });
  }

  // The client-side script will now handle getting the host parameter itself.
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authenticating...</title>
        <script 
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          type="text/javascript"
          defer={false}
        ></script>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            console.log('App Bridge Shell Loaded. Initializing App Bridge...');
            
            const apiKey = "${apiKey}";
            
            // --- THIS IS THE FIX ---
            // This script now gets the host parameter from App Bridge's context on the client side,
            // which is more reliable than relying on URL parameters during the redirect.
            async function initializeAndRedirect() {
              try {
                // First, create the app instance
                const app = AppBridge.createApp({ apiKey });
                console.log('App Bridge instance created.');

                // Use app.getState() to get the current client-side context from Shopify Admin
                const state = await app.getState();
                console.log('App Bridge state received:', state);

                const host = state && state.host;

                if (!host) {
                  console.error('Could not retrieve host from App Bridge state.');
                  document.body.innerHTML = '<p>Could not retrieve Shopify context. Please ensure you are loading the app inside Shopify Admin.</p>';
                  return;
                }

                console.log('Host retrieved from state:', host);
                
                // Now that we have the host, we can tell App Bridge to handle the full auth redirect.
                // App Bridge will now construct the correct OAuth URL.
                app.dispatch(AppBridge.actions.Redirect.toRemote({
                  url: \`/auth?host=\${host}\`,
                }));
                console.log('Redirect dispatched to App Bridge.');

              } catch (e) {
                console.error('Error during App Bridge initialization or redirect:', e);
                document.body.innerHTML = '<p>Error initializing application. Please try again.</p>';
              }
            }

            initializeAndRedirect();
            // --- END OF FIX ---
          });
        </script>
      </head>
      <body>
        <p>Authenticating, please wait...</p>
      </body>
    </html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
};