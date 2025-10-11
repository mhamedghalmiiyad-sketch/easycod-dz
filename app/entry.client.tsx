import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

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

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
