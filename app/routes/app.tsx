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

// --- FINAL LOADER WITH MANUAL RESPONSE OVERRIDE (in app.tsx) ---
export const loader = async (args: LoaderFunctionArgs) => {
  try {
    // Attempt authentication HERE
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

    // On success, return a normal JSON response.
    return json({
      apiKey: process.env.SHOPIFY_API_KEY || "",
      shop: session.shop,
      language,
      translations,
      rtl,
    }, { headers });

  } catch (error) {
    if (error instanceof Response && error.status === 410) {
      console.warn("--- HANDLED (app.tsx): Caught 410. Forcing 200 OK response with loading shell. ---");
      const apiKey = process.env.SHOPIFY_API_KEY || "";
      const html = `<!DOCTYPE html><html><head><title>Authenticating...</title><script src="https://cdn.shopify.com/shopifycloud/app-bridge/edge/index.js"></script><script>document.addEventListener('DOMContentLoaded', function() { if (window.top === window.self) { window.location.href = "/auth/login"; } else { const app = AppBridge.createApp({ apiKey: "${apiKey}" }); app.dispatch(AppBridge.actions.Redirect.toRemote({ url: window.location.href })); } });</script></head><body><p>Authenticating, please wait...</p></body></html>`;
      return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
    }
    throw error; // Re-throw other errors
  }
};
// --- END FINAL LOADER ---


// Component renders only on success
function AppContent() {
  const { apiKey, shop, language, translations, rtl } = useLoaderData<typeof loader>();
  const [isClientReady, setIsClientReady] = useState(false);

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

// --- USE DEFAULT SHOPIFY ERROR BOUNDARY ---
// No special 410 handling needed here anymore
export function ErrorBoundary() { return boundary.error(useRouteError()); }
// --- STANDARD HEADERS FUNCTION ---
export const headers: HeadersFunction = (headersArgs) => { return boundary.headers(headersArgs); };