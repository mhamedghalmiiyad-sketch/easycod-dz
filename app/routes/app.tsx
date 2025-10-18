import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError, isRouteErrorResponse } from "@remix-run/react";
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

// --- LOADER WITHOUT TRY...CATCH ---
// Let authenticate.admin throw the 410 error if it occurs.
export const loader = async (args: LoaderFunctionArgs) => {
  // Authenticate first. If it throws 410, ErrorBoundary will catch it.
  const { session } = await authenticate.admin(args);
  const { request } = args;

  // If authentication succeeds, proceed with all the real logic.
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

  // Success response
  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: session.shop,
    language,
    translations,
    rtl,
    // No 'error' field needed here anymore
  }, { headers });
};
// --- END LOADER ---


// --- COMPONENT WITHOUT ERROR CHECK ---
// Removed the 'error' prop check, ErrorBoundary handles errors now.
function AppContent() {
  const { apiKey, shop, language, translations, rtl } = useLoaderData<typeof loader>();
  const [isClientReady, setIsClientReady] = useState(false);

  // If shop is missing (should only happen if ErrorBoundary failed, unlikely)
  // Render minimal AppProvider for App Bridge.
  if (!shop || !apiKey) {
      console.warn("--- WARNING: shop or apiKey missing in AppContent, rendering minimal shell ---");
       return (
         <AppProvider isEmbeddedApp apiKey={apiKey || ""}>
           <p>Loading app...</p>
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

// --- UPDATED ERROR BOUNDARY ---
export function ErrorBoundary() {
  const error = useRouteError();
  const apiKey = process.env.SHOPIFY_API_KEY || ""; // Get apiKey for AppProvider

  // Check if the error is the specific 410 Response from authentication
  if (isRouteErrorResponse(error) && error.status === 410) {
    console.warn("--- HANDLED: Caught 410 error in ErrorBoundary. Rendering loading shell. ---");
    // Render the loading shell with AppProvider so App Bridge can take over
    return (
      <AppProvider isEmbeddedApp apiKey={apiKey}>
        <p>Authenticating...</p>
      </AppProvider>
    );
  }

  // For all other errors, use the default Shopify boundary handler
  console.error("--- ERROR: Caught in ErrorBoundary (not 410): ---", error);
  return boundary.error(error);
}
// --- END UPDATED ERROR BOUNDARY ---

// --- RESTORED HEADERS FUNCTION ---
export const headers: HeadersFunction = (headersArgs) => {
  // We might still need to check if the error is 410 here and modify headers if needed,
  // but let's try without modification first. The main goal is rendering the shell.
  if ((headersArgs as any).error instanceof Response && (headersArgs as any).error.status === 410) {
      console.warn("--- WARNING: boundary.headers received the 410 error object ---");
      // Let's return minimal headers in this case, primarily CSP from addDocumentResponseHeaders
      return headersArgs.parentHeaders; // Pass through headers set by entry.server.tsx
  }
  // For normal operation or other errors, use the Shopify boundary
  return boundary.headers(headersArgs);
};
// --- END RESTORED HEADERS FUNCTION ---