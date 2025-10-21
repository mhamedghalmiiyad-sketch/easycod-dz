import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-remix/server";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

// This is new: We need the provider for i18n
import { I18nextProvider } from "react-i18next";
import { getTranslations, isRTL } from "../utils/i18n.server";
import clientI18n from "../utils/i18n.client";
import { useEffect } from "react";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// This loader MUST NOT authenticate. It sets up the page shell.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const host = url.searchParams.get("host");
  if (!host) {
    throw new Response("Missing host parameter", { status: 400 });
  }

  // Load basic translations needed for the navigation menu
  const language = 'en'; // Default language for the shell
  const translations = await getTranslations(language);
  const rtl = isRTL(language);

  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    host,
    language,
    translations,
    rtl,
  });
};

// This component provides the main layout and all the necessary "context" providers.
export default function App() {
  const { apiKey, host, language, translations, rtl } = useLoaderData<typeof loader>();

  // This useEffect initializes the client-side i18n instance ONCE.
  useEffect(() => {
    Object.entries(translations || {}).forEach(([namespace, bundle]) => {
      clientI18n.addResourceBundle(language, namespace, bundle || {}, true, true);
    });
    clientI18n.changeLanguage(language);
  }, [language, translations]);

  return (
    <>
      <script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        data-api-key={apiKey}
        type="text/javascript"
        defer={false}
      ></script>
      
      {/* This provider gives the translation context to all child pages */}
      <I18nextProvider i18n={clientI18n}>
        <div style={{ height: '100vh' }} dir={rtl ? 'rtl' : 'ltr'}>
          <AppProvider isEmbeddedApp apiKey={apiKey} host={host}>
            <NavMenu>
              <Link to="/app" rel="home">Dashboard</Link>
              <Link to="/app/form-designer">Form Designer</Link>
              <Link to="/app/settings/general">Settings</Link>
            </NavMenu>
            {/* The Outlet renders the child page (e.g., the dashboard) */}
            <Outlet />
          </AppProvider>
        </div>
      </I18nextProvider>
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