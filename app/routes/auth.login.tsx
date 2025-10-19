import type { LoaderFunctionArgs } from "@remix-run/node";

/**
 * This route exists solely to serve the initial HTML shell needed by App Bridge
 * when it detects no session and redirects the user here client-side.
 * It DOES NOT call the server-side login() function.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("--- DEBUG: /auth/login loader serving App Bridge redirect shell ---");

  const url = new URL(request.url);
  // Shopify provides `shop` and `host` params on this redirect.
  const shop = url.searchParams.get('shop');
  const host = url.searchParams.get('host');

  // We need the API Key to initialize App Bridge
  const apiKey = process.env.SHOPIFY_API_KEY || global.SHOPIFY_ENV_VARS?.SHOPIFY_API_KEY || "";

  if (!apiKey) {
      console.error("FATAL ERROR: Cannot render login shell without SHOPIFY_API_KEY");
      return new Response("Application configuration error.", { status: 500 });
  }

  // If App Bridge didn't provide host or shop, we can't proceed.
  if (!host && !shop) {
    return new Response("Missing host or shop parameter. Please ensure you are loading the app inside Shopify Admin.", { status: 400 });
  }

  // This minimal HTML page will run on the client-side inside the iframe.
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authenticating...</title>
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge/edge/index.js"></script>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            console.log('App Bridge Shell Loaded. Initializing App Bridge...');
            
            const apiKey = "${apiKey}";
            // App Bridge v3.1 prefers the host parameter.
            const host = "${host || ''}";
            const shopOrigin = "${shop || ''}";
            
            // Construct a valid config, prioritizing host.
            // The host parameter is a base64-encoded version of the shop's admin URL.
            const config = { 
              apiKey, 
              host: host || window.btoa(shopOrigin).replace(/=/g, '') 
            };
            console.log('App Bridge Config in login shell:', config);

            // --- THIS IS THE FIX ---
            // Simply create the app. App Bridge will automatically detect that it's in an
            // authentication context and will handle redirecting to the OAuth consent screen.
            // We should NOT dispatch a redirect action ourselves here.
            try {
                AppBridge.createApp(config);
                console.log('App Bridge Initialized. App Bridge will now handle the auth redirect.');
            } catch (e) {
                 console.error('Error initializing App Bridge in login shell:', e);
                 document.body.innerHTML = '<p>Error initializing application. Please try again.</p>';
            }
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
