import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { authenticate } from "../shopify.server";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

// Keep Polaris styles linked
export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

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

// Radically simplified component
export default function App() {
  console.log('--- DEBUG: Simplified app.tsx component is attempting to render! ---');

  return (
    <div style={{ padding: "20px", border: "10px solid blue" }}>
      <h1>App Layout Rendered!</h1>
      <p>If you see this blue border, the layout is working.</p>
      <hr />
      <Outlet /> {/* The index page should render below this line */}
      <hr />
    </div>
  );
}

// Keep error boundary and headers function
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};