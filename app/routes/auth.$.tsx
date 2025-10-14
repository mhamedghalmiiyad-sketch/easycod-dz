import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("--- AUTH CALLBACK START ---");
  console.log("ENV SESSION_SECRET present?", !!process.env.SESSION_SECRET);
  console.log("ENV SHOPIFY_APP_URL", process.env.SHOPIFY_APP_URL);
  console.log("Request URL:", request.url);
  console.log("Request headers:", Object.fromEntries(request.headers.entries()));
  
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
