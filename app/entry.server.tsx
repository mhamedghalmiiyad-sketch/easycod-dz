import { PassThrough } from "stream";
import type { AppLoadContext, EntryContext } from "@remix-run/node";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-fs-backend";
import { resolve } from "path";
import { getLanguageFromRequest } from "./utils/i18n.server";

const ABORT_DELAY = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext
) {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://cdn.shopify.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.shopify.com",
    "connect-src 'self' https://*.shopify.com https://*.shopifycloud.com wss://*.shopifycloud.com https://monorail-edge.shopifysvc.com https://error-analytics-sessions-production.shopifysvc.com",
    "frame-src 'self' https://*.shopify.com https://admin.shopify.com",
    "frame-ancestors https://*.shopify.com https://admin.shopify.com",
  ].join("; ");

  responseHeaders.set("Content-Security-Policy", cspDirectives);
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("X-Frame-Options", "ALLOW-FROM https://admin.shopify.com");
  
  console.log("--- DEBUG: CSP Headers added successfully in entry.server.tsx ---");

  // Create a per-request i18next instance for SSR
  const i18nInstance = createInstance();
  const lng = await getLanguageFromRequest(request);
  
  await i18nInstance
    .use(initReactI18next)
    .use(Backend)
    .init({
      lng,
      fallbackLng: 'en',
      ns: ['common', 'dashboard', 'settings', 'navigation', 'language', 'formDesigner', 'protection', 'pixels', 'visibility', 'googleSheets'],
      defaultNS: 'common',
      backend: {
        loadPath: resolve(process.cwd(), 'app/locales/{{ns}}.{{lng}}.json'),
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });

  return isbot(request.headers.get("user-agent") || "")
    ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext, i18nInstance)
    : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext, i18nInstance);
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  i18nInstance: any
) {
  console.log("--- DEBUG: Handling bot request ---");
  
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    
    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={i18nInstance}>
        <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />
      </I18nextProvider>,
      {
        onAllReady() {
          console.log("--- DEBUG: onAllReady callback triggered for bot. Status: Success ---");
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          
          responseHeaders.set("Content-Type", "text/html");
          
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
          
          pipe(body);
        },
        onShellError(error: unknown) {
          console.error("--- ERROR: onShellError triggered for bot ---", error);
          reject(error);
        },
        onError(error: unknown) {
          console.error("--- ERROR: Streaming error for bot ---", error);
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  i18nInstance: any
) {
  console.log("--- DEBUG: Handling browser request ---");
  // Log the initial content type passed into this function
  console.log("--- DEBUG: Initial Content-Type Header:", responseHeaders.get("Content-Type"));
  console.log("--- DEBUG: Request Method:", request.method);
  
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    
    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={i18nInstance}>
        <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />
      </I18nextProvider>,
      {
        onShellReady() {
          console.log("--- DEBUG: onShellReady callback triggered. Status: Success ---");
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          
          // --- REVISED LOGIC v3 ---
          const currentContentType = responseHeaders.get("Content-Type");
          const url = new URL(request.url); // Get the URL to check the path

          if (request.method === "GET") {
            if (url.pathname === "/auth/session-token") {
              // This is a special GET request that MUST return JSON.
              // Trust whatever Remix/Shopify auth set.
              console.log("--- DEBUG: GET /auth/session-token detected. Preserving Content-Type:", currentContentType, "---");
            } else {
              // This is a normal page load GET request. Force text/html.
              console.log("--- DEBUG: Standard GET request detected. Forcing Content-Type to text/html. (Was:", currentContentType, ") ---");
              responseHeaders.set("Content-Type", "text/html");
            }
          } else if (!currentContentType) {
            // For non-GET requests (like POST) where nothing is set
            console.log("--- DEBUG: Non-GET request and Content-Type not set. Setting to text/html ---");
            responseHeaders.set("Content-Type", "text/html");
          } else {
            // For non-GET requests (like POST) where it's already set (e.g., application/json)
            console.log("--- DEBUG: Non-GET request and Content-Type already set:", currentContentType, ". Preserving it. ---");
          }
          // --- REVISED LOGIC END ---
          
          console.log("--- DEBUG: Resolving response with final Content-Type:", responseHeaders.get("Content-Type"), "and status:", responseStatusCode, "---");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
          
          pipe(body);
        },
        onShellError(error: unknown) {
          console.error("--- ERROR: onShellError triggered ---", error);
          reject(error);
        },
        onError(error: unknown) {
          console.error("--- ERROR: Streaming error ---", error);
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}