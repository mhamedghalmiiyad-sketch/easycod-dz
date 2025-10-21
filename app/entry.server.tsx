import { PassThrough } from "stream";
import type { AppLoadContext, EntryContext } from "@remix-run/node";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";

// --- ADD THESE TWO IMPORTS ---
import { I18nextProvider } from "react-i18next";
import i18n from "./utils/i18n.client"; // Use the same client instance as root.tsx

const ABORT_DELAY = 5000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext
) {
  console.log("--- DEBUG: Starting handleRequest in entry.server.tsx ---");

  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://cdn.shopify.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.shopify.com https://*.shopifycloud.com wss://*.shopifycloud.com https://monorail-edge.shopifysvc.com https://error-analytics-sessions-production.shopifysvc.com",
    "frame-src 'self' https://*.shopify.com https://admin.shopify.com",
    "frame-ancestors https://*.shopify.com https://admin.shopify.com",
  ].join("; ");

  responseHeaders.set("Content-Security-Policy", cspDirectives);
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("X-Frame-Options", "ALLOW-FROM https://admin.shopify.com");
  
  console.log("--- DEBUG: CSP Headers added successfully in entry.server.tsx ---");

  return isbot(request.headers.get("user-agent") || "")
    ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext)
    : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext);
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  console.log("--- DEBUG: Handling bot request ---");
  
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    
    const { pipe, abort } = renderToPipeableStream(
      // --- THIS IS THE FIX ---
      <I18nextProvider i18n={i18n}>
        <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />
      </I18nextProvider>,
      // -----------------------
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
  remixContext: EntryContext
) {
  console.log("--- DEBUG: Handling browser request ---");
  
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    
    const { pipe, abort } = renderToPipeableStream(
      // --- THIS IS THE FIX ---
      <I18nextProvider i18n={i18n}>
        <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />
      </I18nextProvider>,
      // -----------------------
      {
        onShellReady() {
          console.log("--- DEBUG: onShellReady callback triggered. Status: Success ---");
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          
          responseHeaders.set("Content-Type", "text/html");
          
          console.log("--- DEBUG: Resolving response with status:", responseStatusCode, "---");
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