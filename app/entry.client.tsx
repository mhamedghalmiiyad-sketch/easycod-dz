import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import clientI18n from "./utils/i18n.client";

// Suppress non-critical Shopify analytics errors globally
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorMessage = args[0]?.toString() || '';
  // Suppress SendBeacon errors from Shopify analytics
  if (errorMessage.includes('SendBeacon failed') || 
      errorMessage.includes('context-slice-metrics') ||
      errorMessage.includes('monorail-edge.shopifysvc.com')) {
    console.warn('⚠️ Suppressed Shopify analytics error:', ...args);
    return;
  }
  // Log all other errors normally
  originalConsoleError.apply(console, args);
};

async function hydrate() {
  console.log("🌐 Waiting for i18n client initialization...");
  
  // Ensure i18n is initialized before hydrating
  if (!clientI18n.isInitialized) {
    await clientI18n.init({
      fallbackLng: 'en',
      ns: ['common', 'dashboard', 'settings', 'navigation', 'language', 'formDesigner', 'protection', 'pixels', 'visibility', 'googleSheets'],
      defaultNS: 'common',
      react: {
        useSuspense: false,
      },
      interpolation: {
        escapeValue: false,
      },
    });
  }
  
  console.log("✅ i18n client initialized, hydrating React...");
  
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <I18nextProvider i18n={clientI18n}>
          <RemixBrowser />
        </I18nextProvider>
      </StrictMode>
    );
  });
}

if (typeof window !== 'undefined') {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(hydrate);
  } else {
    // Fallback for Safari/browsers that don't support requestIdleCallback
    window.setTimeout(hydrate, 1);
  }
}
