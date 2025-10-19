// app/routes/auth.login.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";

/**
 * This route exists solely to serve the initial HTML shell needed by App Bridge
 * when it detects no session and redirects the user here client-side.
 * It DOES NOT call the server-side login() function.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("--- DEBUG: /auth/login loader serving App Bridge HTML shell ---");

  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');
  const host = url.searchParams.get('host'); // App Bridge might add this

  // Essential: Get API Key for the App Bridge script
  const apiKey = process.env.SHOPIFY_API_KEY || global.SHOPIFY_ENV_VARS?.SHOPIFY_API_KEY || "";

  if (!apiKey) {
      console.error("FATAL ERROR: Cannot render login shell without SHOPIFY_API_KEY");
      return new Response("Application configuration error.", { status: 500 });
  }

  // Minimal HTML to initialize App Bridge client-side
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authenticating...</title>
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge/edge/index.js"></script>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            console.log('App Bridge Shell Loaded. Initializing App Bridge...');
            const shopOrigin = "${shop || ''}"; // Get shop from URL param
            const apiKey = "${apiKey}";

            if (!apiKey) {
              console.error('API Key missing in App Bridge script.');
              document.body.innerHTML = '<p>Application configuration error (API Key missing).</p>';
              return;
            }
            if (!shopOrigin) {
               console.error('Shop origin missing in App Bridge script.');
               // Potentially redirect to a manual login or error page if shop is missing
               // For now, show an error. App Bridge needs the shop.
               document.body.innerHTML = '<p>Shop parameter missing. Please ensure you are accessing the app correctly through Shopify.</p>';
               return;
            }

            const config = { apiKey: apiKey, shopOrigin: shopOrigin, host: "${host || ''}" };
            console.log('App Bridge Config:', config);

            try {
                const app = AppBridge.createApp(config);
                console.log('App Bridge Initialized. Redirecting to app root...');
                // Redirect back to the app's root URL within Shopify Admin.
                // App Bridge will handle adding necessary parameters.
                 app.dispatch(AppBridge.actions.Redirect.toApp({ path: '/app' })); // Go to /app
            } catch (e) {
                 console.error('Error initializing App Bridge:', e);
                 document.body.innerHTML = '<p>Error initializing application. Please try again.</p>';
            }
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
