import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

// This loader function runs when a user hits the root URL of your app (/).
export const loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  // If the 'shop' parameter is present, it means we're being loaded by Shopify.
  // We MUST redirect to the '/app' route, preserving all query parameters.
  if (shop) {
    console.log("--- DEBUG: Root loader redirecting to /app, preserving params ---");
    
    // Create a new URL pointing to the /app path
    const appUrl = new URL(url);
    appUrl.pathname = "/app";
    
    // `redirect` is a helper from Remix that sends a 302 redirect response.
    // This forwards the user (and all parameters like shop, host, etc.) to the correct page.
    return redirect(appUrl.toString());
  }

  // If there's no shop parameter, render a simple landing page.
  // This is what someone would see if they visit your app's URL directly.
  return null;
};

// This component will only render if the loader doesn't redirect.
export default function Index() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Welcome to Alma COD</h1>
      <p>This is a Shopify app. To use it, please install it on your store and open it from your Shopify Admin dashboard.</p>
    </div>
  );
}