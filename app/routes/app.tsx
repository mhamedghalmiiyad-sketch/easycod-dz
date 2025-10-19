import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-remix/server";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// This loader runs on every page but does NOT authenticate.
// Its only job is to get the essential parameters for App Bridge.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // Shopify provides the `host` parameter for embedded apps.
  // This is a base64-encoded version of the shop's admin URL.
  const host = url.searchParams.get("host");
  if (!host) {
    // This should not happen when loaded inside Shopify Admin.
    throw new Response("Missing host parameter", { status: 400 });
  }

  console.log(`--- DEBUG: app.tsx loader ran. Host: ${host}`);

  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    host, // Pass the host parameter to the client
  });
};

export default function App() {
  const { apiKey, host } = useLoaderData<typeof loader>();

  return (
    <>
      <script
        src="https://cdn.shopify.com/shopifycloud/app-bridge/edge/index.js"
        data-api-key={apiKey}
        data-host={host}
      ></script>
      {/* The AppProvider component correctly initializes App Bridge on the client side.
        App Bridge will then handle the authentication state using the host from the script tag.
      */}
      <AppProvider isEmbeddedApp apiKey={apiKey}>
        {/* The NavMenu renders the app's navigation within the Shopify Admin. */}
        <NavMenu>
          <Link to="/app" rel="home">
            Dashboard
          </Link>
          <Link to="/app/form-designer">Form Designer</Link>
          <Link to="/app/settings/general">Settings</Link>
        </NavMenu>
        {/* The Outlet renders the actual page content (e.g., the dashboard). */}
        <Outlet />
      </AppProvider>
    </>
  );
}

// Shopify needs Remix to catch errors correctly.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

// The headers function is part of the boilerplate that allows Shopify to set
// necessary security headers.
export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};