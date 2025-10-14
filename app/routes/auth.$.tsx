import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("--- AUTH CALLBACK START ---");
  console.log("ENV SESSION_SECRET present?", !!process.env.SESSION_SECRET);
  console.log("ENV SHOPIFY_APP_URL", process.env.SHOPIFY_APP_URL);
  console.log("Request URL:", request.url);
  console.log("Request headers:", Object.fromEntries(request.headers.entries()));
  
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const embedded = url.searchParams.get("embedded");
  
  // Check if this request is coming from within an iframe (Shopify embedded app)
  const isEmbedded = embedded === "1" || 
    request.headers.get("sec-fetch-dest") === "iframe" ||
    request.headers.get("sec-fetch-mode") === "navigate" && 
    request.headers.get("sec-fetch-site") === "cross-site";
  
  console.log("Embedded detection:", { 
    embedded, 
    secFetchDest: request.headers.get("sec-fetch-dest"),
    secFetchMode: request.headers.get("sec-fetch-mode"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    isEmbedded 
  });
  
  // If we're in an iframe and have a shop parameter, redirect to top-level auth
  if (isEmbedded && shop) {
    console.log("🔄 Redirecting to top-level auth for iframe breakout");
    return redirect(`/auth/toplevel?shop=${encodeURIComponent(shop)}`);
  }
  
  try {
    const result = await authenticate.admin(request);
    console.log("Session created/retrieved:", { 
      id: result.session?.id, 
      shop: result.session?.shop,
      isOnline: result.session?.isOnline 
    });
    
    // Log response headers after authentication
    console.log("Authentication successful - session persisted");
    return result;
  } catch (error) {
    console.error("Session creation/retrieval error:", error);
    throw error;
  }
};
