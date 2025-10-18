import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { authenticate } from "../shopify.server";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

// Keep Polaris styles linked
export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// Minimal loader - just authenticate and return the shop
export const loader = async (args: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(args);
  console.log(`--- DEBUG: Simplified app.tsx loader ran. Shop: ${session.shop}`);
  // Only return the shop, which is essential for some basic App Bridge functions
  return json({ shop: session.shop });
};

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