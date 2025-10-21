import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import {
  createReadableStreamFromReadable,
  type EntryContext,
} from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";
import { I18nextProvider } from "react-i18next";
import i18n from "./utils/i18n.client";

export const streamTimeout = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? '')
    ? "onAllReady"
    : "onShellReady";

  // Add CSP headers (this part is now correct)
  try {
    addDocumentResponseHeaders(request, responseHeaders);
    console.log("--- DEBUG: CSP Headers added successfully in entry.server.tsx ---");
  } catch (headerError) {
    console.error("--- FATAL ERROR setting CSP headers in entry.server.tsx ---:", headerError);
    // Continue attempting to render, but log the critical header failure
  }

  return new Promise((resolve, reject) => {
    let didError = false; // Flag to track if an error occurred

    console.log(`--- DEBUG: Starting renderToPipeableStream with callback: ${callbackName} ---`);

    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={i18n}>
        <RemixServer
          context={remixContext}
          url={request.url}
          abortDelay={streamTimeout} // Use abortDelay
        />
      </I18nextProvider>,
      {
        [callbackName]: () => {
          console.log(`--- DEBUG: ${callbackName} callback triggered. Status: ${didError ? 'Error' : 'Success'} ---`);
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          console.log(`--- DEBUG: Resolving response with status: ${responseStatusCode} ---`);
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode, // Use 500 if error occurred
            })
          );
          pipe(body);
        },
        onShellError: (error: unknown) => {
          didError = true;
          console.error("--- FATAL ERROR: onShellError in renderToPipeableStream ---");
          console.error(error); // Log the actual error object
          reject(error); // Reject the promise to indicate failure
        },
        onError: (error: unknown) => {
          didError = true;
          // Log the error, but don't necessarily reject - onShellError usually handles fatal errors
          // This might catch hydration errors or errors within suspense boundaries
          console.error("--- ERROR: onError in renderToPipeableStream ---");
          console.error(error); // Log the actual error object
          // Update status code if it wasn't already set by a loader error
          if (responseStatusCode === 200) {
              responseStatusCode = 500;
          }
        },
      }
    );

    // Keep the timeout, but log if it triggers
    setTimeout(() => {
        console.warn("--- WARNING: SSR Stream timeout reached. Aborting render. ---");
        abort();
    }, streamTimeout + 1000);
  });
}