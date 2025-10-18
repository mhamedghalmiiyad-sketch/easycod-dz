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
// --- RESTORED i18n SERVER IMPORTS ---
import { getLanguageFromRequest, getTranslations, isRTL, saveLanguagePreference } from "../utils/i18n.server";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// --- RESTORED FULL LOADER WITH AUTH AND i18n ---
export const loader = async (args: LoaderFunctionArgs) => {
  // Authenticate first - this protects all child routes too
  const { session } = await authenticate.admin(args);
  const { request } = args; // Destructure after auth

  // Restore i18n logic
  const language = await getLanguageFromRequest(request, session.id);
  const translations = await getTranslations(language);
  const rtl = isRTL(language);

  const url = new URL(request.url);
  const langParam = url.searchParams.get('lang');
  if (langParam && ['en', 'ar', 'fr'].includes(langParam)) {
    try {
      await saveLanguagePreference(session.id, langParam);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  }

  const headers = new Headers();
  headers.set('Set-Cookie', `i18nextLng=${language}; Path=/; Max-Age=31536000; SameSite=Lax`);

  console.log(`--- DEBUG: app.tsx loader finished. Lang: ${language}`); // Keep one debug log

  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: session.shop,
    language,
    translations, // Pass full translations
    rtl,
  }, { headers });
};
// --- END RESTORED LOADER ---


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

  const getTranslation = (key: string) => {
    if (!isClientReady) {
      const parts = key.split(':');
      const ns = parts.length > 1 ? parts[0] : 'common'; // Default ns if needed
      const k = parts.length > 1 ? parts[1] : key;
      return (translations as any)?.[ns]?.[k] || k;
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