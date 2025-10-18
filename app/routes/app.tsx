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

// --- FINAL LOADER WITH ERROR HANDLING ---
export const loader = async (args: LoaderFunctionArgs) => {
  try {
    // We try to authenticate as normal. This is the single auth point.
    const { session } = await authenticate.admin(args);
    const { request } = args;

    // If authentication succeeds, we proceed with all the real logic.
    const language = await getLanguageFromRequest(request, session.id);
    const translations = await getTranslations(language);
    const rtl = isRTL(language);

    const url = new URL(request.url);
    const langParam = url.searchParams.get('lang');
    if (langParam && ['en', 'ar', 'fr'].includes(langParam)) {
      await saveLanguagePreference(session.id, langParam);
    }

    const headers = new Headers();
    headers.set('Set-Cookie', `i18nextLng=${language}; Path=/; Max-Age=31536000; SameSite=Lax`);

    console.log("--- DEBUG: app.tsx loader finished successfully! ---");

    // Success response defaults to 200 OK
    return json({
      apiKey: process.env.SHOPIFY_API_KEY || "",
      shop: session.shop,
      language,
      translations,
      rtl,
      error: null, // No error
    }, { headers });

  } catch (error) {
    // This block catches errors thrown by authenticate.admin
    if (error instanceof Response && error.status === 410) {
      // This is our specific, known bug on initial load.
      console.warn("--- HANDLED: Caught 410 Gone error on initial load. Rendering app shell with STATUS 200. ---");
      // Return dummy data so the app shell can render without crashing.
      // --- CRITICAL FIX: EXPLICITLY SET STATUS 200 ---
      return json({
        apiKey: process.env.SHOPIFY_API_KEY || "",
        shop: null, // No shop available
        language: 'en',
        translations: {},
        rtl: false,
        error: "410_AUTHENTICATION_PENDING", // Send an error flag to the client
      }, { status: 200 }); // <-- Force 200 OK status
      // --- END CRITICAL FIX ---
    }
    
    // If it's a different error (e.g., a real redirect), re-throw it.
    throw error;
  }
};
// --- END FINAL LOADER ---


// --- FINAL COMPONENT WITH GRACEFUL HANDLING ---
function AppContent() {
  const { apiKey, shop, language, translations, rtl, error } = useLoaderData<typeof loader>();
  const [isClientReady, setIsClientReady] = useState(false);

  // If we caught the 410, the component might render briefly before App Bridge takes over.
  // We can show a simple loading state.
  if (error === "410_AUTHENTICATION_PENDING" || !shop) {
    // AppProvider still needs an apiKey to initialize App Bridge, which will handle the redirect.
    return (
       <AppProvider isEmbeddedApp apiKey={apiKey || ""}>
         <p>Loading...</p>
       </AppProvider>
    );
  }

  // The rest of your original component logic...
  useEffect(() => {
    if (typeof window !== 'undefined' && apiKey && shop) {
      sessionStorage.setItem('app-bridge-config', JSON.stringify({ apiKey: apiKey, shopOrigin: shop }));
    }
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

  return (
    <I18nextProvider i18n={clientI18n}>
      <div style={{ height: '100vh' }} dir={rtl ? 'rtl' : 'ltr'}>
        <AppProvider isEmbeddedApp apiKey={apiKey}>
          <NavMenu>
            <Link to="/app" rel="home">{getTranslation('navigation:dashboard')}</Link>
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