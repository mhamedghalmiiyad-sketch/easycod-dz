import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

// Helper function to calculate HMAC signature for validation
async function calculateHmac(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper function for HMAC validation
async function validateAppProxyRequest(request: Request): Promise<boolean> {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  const signature = params.get("signature");
  if (!signature) return false;

  params.delete("signature");
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiSecret) {
    console.error("SHOPIFY_API_SECRET is not defined");
    return false;
  }

  const calculatedHmac = await calculateHmac(sortedParams, apiSecret);
  return calculatedHmac === signature;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("🏓 Ping route was hit at:", new Date().toLocaleTimeString());
  console.log("🔍 Request URL:", request.url);

  // Validate the request is from Shopify
  const isValid = await validateAppProxyRequest(request);
  if (!isValid) {
    console.log("❌ HMAC validation failed");
    return json({ 
      status: "error", 
      message: "Unauthorized request" 
    }, { status: 401 });
  }

  try {
    const data = {
      status: "ok",
      message: "Your App Proxy is working perfectly!",
      timestamp: new Date().toISOString(),
      url: request.url
    };

    console.log("✅ Ping response:", data);

    return json(data, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("❌ Error in ping route:", error);

    return json(
      { 
        status: "error", 
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
};