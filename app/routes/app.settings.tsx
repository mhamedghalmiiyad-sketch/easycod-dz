import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLocation, useLoaderData } from "@remix-run/react";
import { Page, Tabs, Box } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getLanguageFromRequest, getTranslations, isRTL, saveLanguagePreference } from "../utils/i18n.server";
import { useTranslation } from "react-i18next";
import { I18nextProvider } from "react-i18next";
import clientI18n from "../utils/i18n.client";
import { useEffect } from "react";

// Loader to ensure user is authenticated and load translations
export const loader = async ({ request }: LoaderFunctionArgs) => {
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
    language,
    translations,
    rtl,
  }, { headers });
};

export default function SettingsLayout() {
  const location = useLocation();
  const { language, translations, rtl } = useLoaderData<typeof loader>();
  
  // Use settings namespace for translations
  const { t } = useTranslation('settings');

  // Initialize client i18n with server data
  useEffect(() => {
    Object.entries(translations).forEach(([namespace, bundle]) => {
      clientI18n.addResourceBundle(language, namespace, bundle, true, true);
    });
    clientI18n.changeLanguage(language);
    
    // Set document direction and language
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [language, translations, rtl]);

  // Define the tabs for your settings page
  const tabs = [
    {
      id: "pixels",
      content: "Pixels",
      url: "/app/settings/pixels",
    },
    {
      id: "integrations",
      content: "Integrations",
      url: "/app/settings/integrations",
    },
    {
      id: "visibility",
      content: "Visibility",
      url: "/app/settings/visibility",
    },
    {
      id: "protection",
      content: "Protection",
      url: "/app/settings/protection",
    },
    {
      id: "general",
      content: "General",
      url: "/app/settings/general",
    },
  ];

  // Determine the selected tab based on the current URL
  const getSelectedTabIndex = () => {
    if (location.pathname.startsWith("/app/settings/pixels")) return 0;
    if (location.pathname.startsWith("/app/settings/integrations")) return 1;
    if (location.pathname.startsWith("/app/settings/visibility")) return 2;
    if (location.pathname.startsWith("/app/settings/protection")) return 3;
    if (location.pathname.startsWith("/app/settings/general")) return 4;
    return 0; // Default to 'Pixels'
  };

  const selectedTabIndex = getSelectedTabIndex();

  return (
    <I18nextProvider i18n={clientI18n}>
      <div style={{ height: '100vh' }} dir={rtl ? 'rtl' : 'ltr'}>
        <Page
          title="Settings"
          subtitle="Manage your application's configuration and integrations"
        >
          <Tabs 
            tabs={tabs.map(tab => ({
              id: tab.id,
              content: tab.content,
              url: tab.url,
            }))} 
            selected={selectedTabIndex}
          />
          {/* The Outlet will render the content of the active nested route */}
          <Box paddingBlockStart="400">
            <Outlet />
          </Box>
        </Page>
      </div>
    </I18nextProvider>
  );
}
