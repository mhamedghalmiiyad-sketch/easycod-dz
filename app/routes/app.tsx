import type { LoaderFunctionArgs, HeadersFunction, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { I18nextProvider } from "react-i18next";
import clientI18n from "../utils/i18n.client";
import { useEffect, useState } from "react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { useTranslations } from "../hooks/useTranslations";
import { getLanguageFromRequest, getTranslations, isRTL, saveLanguagePreference } from "../utils/i18n.server";
import { shopifyEnv } from "../utils/env.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // ✅ Server-only import is moved inside the loader
  const { authenticate } = await import("../shopify.server");
  const { session } = await authenticate.admin(request);

  // Get language and translations (check database first, then URL params)
  const language = await getLanguageFromRequest(request, session.id);
  const translations = await getTranslations(language);
  const rtl = isRTL(language);
  
  // Save language preference to database if it came from URL parameter
  const url = new URL(request.url);
  const langParam = url.searchParams.get('lang');
  if (langParam && ['en', 'ar', 'fr'].includes(langParam)) {
    try {
      await saveLanguagePreference(session.id, langParam);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  }
  
  // Set cookie for language persistence
  const headers = new Headers();
  headers.set('Set-Cookie', `i18nextLng=${language}; Path=/; Max-Age=31536000; SameSite=Lax`);

  return json({ 
    apiKey: shopifyEnv.apiKey || "",
    shop: session.shop,
    language,
    translations,
    rtl,
  }, { headers });
};

function AppContent() {
  const { apiKey, shop, language, translations, rtl } = useLoaderData<typeof loader>();
  const [isClientReady, setIsClientReady] = useState(false);

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

// Shopify needs Remix to catch errors correctly.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

// The 'headers' function is now correctly typed using 'HeadersFunction' from Remix.
export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
