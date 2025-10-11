import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // ✅ Server-only import is moved inside the loader
  const { authenticate } = await import("../shopify.server");
  await authenticate.admin(request);

  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Dashboard
        </Link>
        <Link to="/app/form-designer">Form Designer</Link>
        <Link to="/app/visibility">Visibility</Link>
        <Link to="/app/pixels">Pixels</Link>
        <Link to="/app/google-sheets">Google Sheets</Link>
        <Link to="/app/analytics">Analytics</Link>
        <Link to="/app/user-blocking">User Blocking</Link>
        <Link to="/app/general">General Settings</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch errors correctly.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

// The 'headers' function is now correctly typed using 'HeadersFunction' from Remix.
export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
