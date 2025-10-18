import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// --- FINAL DEBUGGING LOADER (NO AUTH) ---
export const loader = async (args: LoaderFunctionArgs) => {
  console.log(`--- DEBUG: Loader in ${args.request.url} running WITHOUT authentication ---`);

  // TEMPORARILY COMMENTED OUT: await authenticate.admin(args);

  // Return minimal dummy data
  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "DUMMY_API_KEY", // Provide dummy key
    shop: "dummy-shop.myshopify.com", // Provide dummy shop
    language: 'en',
    translations: {},
    rtl: false,
  });
};
// --- END FINAL DEBUGGING LOADER ---

// Radically simplified index page component
export default function AppIndex() {
  console.log('--- DEBUG: Simplified app._index.tsx component is attempting to render! ---');

  return (
    <div style={{ padding: "20px", border: "10px solid orange" }}>
      <h2>App Index Page Rendered!</h2>
      <p>If you see this orange border, the index page is working.</p>
    </div>
  );
}