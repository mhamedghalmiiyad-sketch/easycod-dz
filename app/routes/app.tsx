import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-remix/server";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { isRTL } from "../utils/i18n.server";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// This loader MUST NOT authenticate. It sets up the page shell.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const host = url.searchParams.get("host");
  if (!host) {
    throw new Response("Missing host parameter", { status: 400 });
  }

  // Determine language and RTL direction
  const language = 'en'; // Default language for the shell
  const rtl = isRTL(language);

  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    host,
    language,
    rtl,
  });
};

// This component provides the main layout and all the necessary "context" providers.
export default function App() {
  const { apiKey, host, language, rtl } = useLoaderData<typeof loader>();
  const { i18n } = useTranslation();

  // Sync client-side language with server language
  useEffect(() => {
    if (i18n.isInitialized && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  return (
    <div style={{ height: '100vh' }} dir={rtl ? 'rtl' : 'ltr'}>
      <AppProvider isEmbeddedApp apiKey={apiKey}>
        <NavMenu>
          <Link to="/app" rel="home">Dashboard</Link>
          <Link to="/app/form-designer">Form Designer</Link>
          <Link to="/app/settings/general">Settings</Link>
          <Link to="/app/faq">FAQ</Link>
        </NavMenu>
        <Outlet />
      </AppProvider>
    </div>
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