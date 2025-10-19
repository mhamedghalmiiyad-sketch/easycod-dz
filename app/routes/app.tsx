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
// Import i18n functions BUT NOT authenticate
import { getLanguageFromRequest, getTranslations, isRTL, saveLanguagePreference } from "../utils/i18n.server";
// import { authenticate } from "../shopify.server"; // <-- REMOVED

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// --- LOADER WITHOUT AUTHENTICATION ---
export const loader = async (args: LoaderFunctionArgs) => {
  const { request } = args;
  const url = new URL(request.url);
  // *** CRITICAL: Get shop from URL query param ***
  const shopParam = url.searchParams.get('shop');

  // Basic i18n detection (no session ID available)
  const langParam = url.searchParams.get('lang');
  const cookieLang = request.headers.get('Cookie')?.match(/i18nextLng=([a-z]{2})/)?.[1];
  const language = langParam || cookieLang || 'en';
  const translations = await getTranslations(language);
  const rtl = isRTL(language);

  const headers = new Headers();
  headers.set('Set-Cookie', `i18nextLng=${language}; Path=/; Max-Age=31536000; SameSite=Lax`);

  console.log(`--- DEBUG: app.tsx loader ran WITHOUT auth. Lang: ${language}, Shop Param: ${shopParam}`);

  // Return apiKey and shopParam for App Bridge initialization
  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: shopParam, // Pass shop from URL param
    language,
    translations,
    rtl,
  }, { headers, status: 200 }); // Ensure 200 OK
};
// --- END LOADER ---


// --- COMPONENT ALWAYS RENDERS SHELL ---
function AppContent() {
  const { apiKey, shop, language, translations, rtl } = useLoaderData<typeof loader>();
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    // Pass apiKey and shopOrigin to App Bridge config IMMEDIATELY
    if (typeof window !== 'undefined' && apiKey && shop) {
      sessionStorage.setItem('app-bridge-config', JSON.stringify({ apiKey: apiKey, shopOrigin: shop }));
      console.log('--- DEBUG: App Bridge config set:', { apiKey, shop });
    } else if (typeof window !== 'undefined' && apiKey) {
        // Fallback if shop param missing (less ideal)
         sessionStorage.setItem('app-bridge-config', JSON.stringify({ apiKey: apiKey }));
         console.log('--- DEBUG: App Bridge config set (API Key only):', { apiKey });
    }

    // Initialize i18n
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
      const ns = parts.length > 1 ? parts[0] : 'common';
      const k = parts.length > 1 ? parts[1] : key;
      return (translations as any)?.[ns]?.[k] || k;
    }
    return clientI18n.t(key);
  };

  // Render the shell containing AppProvider. App Bridge will handle auth state.
  return (
    <I18nextProvider i18n={clientI18n}>
      <div style={{ height: '100vh' }} dir={rtl ? 'rtl' : 'ltr'}>
        {/* AppProvider MUST be rendered for App Bridge to work */}
        <AppProvider isEmbeddedApp apiKey={apiKey || ""}>
          <NavMenu>
            <Link to="/app" rel="home">{getTranslation('navigation:dashboard')}</Link>
            <Link to="/app/form-designer">{getTranslation('navigation:formDesigner')}</Link>
            <Link to="/app/settings/general">{getTranslation('navigation:settings')}</Link>
          </NavMenu>
          {/* Outlet renders the child page which WILL authenticate */}
          <Outlet />
        </AppProvider>
      </div>
    </I18nextProvider>
  );
}

export default function App() {
  return <AppContent />;
}

// --- USE DEFAULT SHOPIFY ERROR BOUNDARY ---
// No special 410 handling needed here anymore
export function ErrorBoundary() { return boundary.error(useRouteError()); }
// --- STANDARD HEADERS FUNCTION ---
export const headers: HeadersFunction = (headersArgs) => { return boundary.headers(headersArgs); };