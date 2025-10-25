import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-remix/server";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

// This is new: We need the provider for i18n
import { I18nextProvider } from "react-i18next";
import { getTranslations, isRTL, initI18n } from "../utils/i18n.server";
import clientI18n from "../utils/i18n.client";
import { useEffect, useState, useMemo } from "react";

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
  const [isClient, setIsClient] = useState(false);
  
  // Detect if we're running on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create a server-side i18n instance during SSR that's already initialized
  // On the client, use the clientI18n instance
  const i18nInstance = useMemo(() => {
    if (typeof window === 'undefined') {
      // Server-side: create a temporary initialized instance
      const { createInstance } = require('i18next');
      const { initReactI18next } = require('react-i18next');
      const serverInstance = createInstance();
      
      serverInstance.use(initReactI18next).init({
        lng: language,
        fallbackLng: 'en',
        ns: ['common', 'dashboard', 'settings', 'navigation', 'language', 'formDesigner', 'protection', 'pixels', 'visibility', 'googleSheets'],
        defaultNS: 'common',
        resources: {
          [language]: translations,
        },
        react: {
          useSuspense: false,
        },
        interpolation: {
          escapeValue: false,
        },
      });
      
      return serverInstance;
    }
    
    // Client-side: use the shared client instance
    return clientI18n;
  }, [language, translations]);

  // This useEffect initializes the client-side i18n instance ONCE (only on client).
  useEffect(() => {
    if (!isClient) return;
    
    // Wait for i18n to be ready
    if (!clientI18n || !clientI18n.isInitialized) {
      console.warn('Client i18n not initialized yet, skipping translation loading');
      return;
    }
    
    // Safety check: ensure clientI18n methods are available
    if (typeof clientI18n.addResourceBundle !== 'function') {
      console.warn('Client i18n methods not available');
      return;
    }
    
    // Add translations to the instance
    Object.entries(translations || {}).forEach(([namespace, bundle]) => {
      clientI18n.addResourceBundle(language, namespace, bundle || {}, true, true);
    });
    
    // Change language if needed
    if (clientI18n.language !== language) {
      clientI18n.changeLanguage(language);
    }
  }, [language, translations, isClient]);

  return (
    <>
      {/*
        FIX: The manual <script> tag for App Bridge has been removed.
        The <AppProvider> component from @shopify/shopify-app-remix/react
        handles injecting this script for you. Including it manually can cause conflicts.
      */}
      <I18nextProvider i18n={i18nInstance}>
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