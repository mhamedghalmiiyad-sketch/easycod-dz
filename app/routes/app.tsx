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
import { getLanguageFromRequest, getTranslations, isRTL, saveLanguagePreference } from "../utils/i18n.server";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async (args: LoaderFunctionArgs) => {
  // --- THIS IS THE FIX ---
  // We now pass the entire `args` object ({ request, context })
  // to our new authentication function.
  const { session } = await authenticate.admin(args);
  // --- END FIX ---

  const { request } = args;
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

  return json({ 
    apiKey: process.env.SHOPIFY_API_KEY || "", // This is for the client-side AppProvider, it's safe.
    shop: session.shop,
    language,
    translations,
    rtl,
  }, { headers });
};

function AppContent() {
  const { apiKey, shop, language, translations, rtl } = useLoaderData<typeof loader>();
  const [isClientReady, setIsClientReady] = useState(false);

  // --- DEBUGGING CODE ---
  console.log('--- DEBUG: app.tsx (Layout) is rendering! ---');
  console.log('--- DEBUG: Loader data in app.tsx:', { apiKey, shop, language, rtl });
  // --- END DEBUGGING CODE ---

  // Initialize client i18n with server data
  useEffect(() => {
    // Set App Bridge configuration in session storage
    if (typeof window !== 'undefined' && apiKey && shop) {
      sessionStorage.setItem('app-bridge-config', JSON.stringify({
        apiKey: apiKey,
        shopOrigin: shop
      }));
    }

    Object.entries(translations).forEach(([namespace, bundle]) => {
      clientI18n.addResourceBundle(language, namespace, bundle, true, true);
    });
    
    // Set language and ensure it's ready before rendering
    clientI18n.changeLanguage(language).then(() => {
      // Set document direction and language after language change is complete
      document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', language);
      setIsClientReady(true);
    });
  }, [language, translations, rtl, apiKey, shop]);

  // Use server-side translations for initial render to prevent hydration mismatch
  const getTranslation = (key: string) => {
    if (!isClientReady) {
      // Use server-side translation during initial render
      const [namespace, translationKey] = key.split(':');
      return (translations as any)[namespace]?.[translationKey] || key;
    }
    return clientI18n.t(key);
  };

  return (
    <I18nextProvider i18n={clientI18n}>
      {/* --- DEBUGGING STYLE: RED BACKGROUND --- */}
      <div style={{ height: '100vh', backgroundColor: 'lightcoral' }} dir={rtl ? 'rtl' : 'ltr'}>
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

// Shopify needs Remix to catch errors correctly.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

// The 'headers' function is now correctly typed using 'HeadersFunction' from Remix.
export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
