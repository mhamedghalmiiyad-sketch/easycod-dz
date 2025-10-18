import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { I18nextProvider } from "react-i18next";
import clientI18n from "../utils/i18n.client";
import { useEffect, useState } from "react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
// Removed i18n server imports for now
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// --- SIMPLE LOADER WITH AUTH ---
export const loader = async (args: LoaderFunctionArgs) => {
  // Authenticate first
  const { session } = await authenticate.admin(args);
  console.log(`--- DEBUG: app.tsx loader ran WITH authentication. Shop: ${session.shop}`);

  // Return minimal data needed by the component's providers
  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "", // Needed for AppProvider
    shop: session.shop,                        // Needed for AppProvider/session storage
    // Use dummy i18n data for now
    language: 'en',
    translations: { navigation: {} }, // Provide dummy structure
    rtl: false,
  });
};
// --- END SIMPLE LOADER WITH AUTH ---


// --- ORIGINAL COMPONENT CODE RESTORED ---
function AppContent() {
  const { apiKey, shop, language, translations, rtl } = useLoaderData<typeof loader>();
  const [isClientReady, setIsClientReady] = useState(false);

  // Debug log to ensure component renders
  console.log('--- DEBUG: Original app.tsx component rendering ---');

  // Initialize client i18n with potentially empty server data (will update client-side)
  useEffect(() => {
    if (typeof window !== 'undefined' && apiKey && shop) {
      sessionStorage.setItem('app-bridge-config', JSON.stringify({
        apiKey: apiKey,
        shopOrigin: shop
      }));
    }

    // Add potentially empty bundles initially
    Object.entries(translations || {}).forEach(([namespace, bundle]) => {
      clientI18n.addResourceBundle(language, namespace, bundle || {}, true, true);
    });

    clientI18n.changeLanguage(language).then(() => {
      document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', language);
      setIsClientReady(true);
    });
  }, [language, translations, rtl, apiKey, shop]);

  // Use clientI18n directly once ready, fallback gracefully
  const getTranslation = (key: string) => {
    if (!isClientReady) {
      // Basic fallback while client loads
      const parts = key.split(':');
      return parts.length > 1 ? parts[1] : key;
    }
    return clientI18n.t(key);
  };

  return (
    // No debug background color needed now
    <I18nextProvider i18n={clientI18n}>
      <div style={{ height: '100vh' }} dir={rtl ? 'rtl' : 'ltr'}>
        <AppProvider isEmbeddedApp apiKey={apiKey}>
          <NavMenu>
            <Link to="/app" rel="home">
              {getTranslation('navigation:dashboard')}
            </Link>
            <Link to="/app/form-designer">{getTranslation('navigation:formDesigner')}</Link>
            <Link to="/app/settings/general">{getTranslation('navigation:settings')}</Link>
          </NavMenu>
          <Outlet />
        </AppProvider>
      </div>
    </I18nextProvider>
  );
}

export default function App() {
  return <AppContent />;
}

// Keep error boundary and headers function
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};