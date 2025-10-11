// File: app/routes/apps.proxy.algeria-locations.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import crypto from "crypto";
import { db } from "../db.server";

// Helper function to calculate HMAC signature
function calculateHmac(data: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");
}

// Helper function for HMAC validation
async function validateAppProxyRequest(request: Request): Promise<boolean> {
  console.log("🔍 Validating algeria-locations app proxy request");
  console.log("🔍 Request URL:", request.url);
  
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  const signature = params.get("signature");
  console.log("🔍 Signature from URL:", signature);
  if (!signature) {
    console.log("❌ No signature found in URL");
    return false;
  }

  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiSecret) {
    console.error("❌ SHOPIFY_API_SECRET is not defined");
    return false;
  }

  // Build the string to sign according to Shopify's specification
  // 1. Remove the signature parameter
  params.delete("signature");
  
  // 2. Get all remaining parameters and sort them lexicographically by key
  const paramEntries: Array<[string, string]> = [];
  for (const [key, value] of params.entries()) {
    paramEntries.push([key, value || '']); // Handle empty values
  }
  
  // 3. Sort by key name (lexicographically)
  paramEntries.sort(([a], [b]) => a.localeCompare(b));
  
  // 4. Build the canonical query string
  const stringToSign = paramEntries
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  console.log("🔍 String to sign:", stringToSign);
  console.log("🔍 All parameters:", paramEntries);

  const calculatedHmac = calculateHmac(stringToSign, apiSecret);
  console.log("🔍 Calculated HMAC:", calculatedHmac);
  console.log("🔍 Expected signature:", signature);
  
  // Compare signatures case-insensitively
  const isValid = calculatedHmac.toLowerCase() === signature.toLowerCase();
  console.log("🔍 HMAC matches:", isValid);
  
  return isValid;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("🔍 Algeria locations proxy route accessed");
  console.log("Request URL:", request.url);
  console.log("Request method:", request.method);
  
  // Validate the request signature
  const isValid = await validateAppProxyRequest(request);
  if (!isValid) {
    console.log("❌ App proxy validation failed for algeria-locations");
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Add CORS headers for frontend access
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; font-src 'self' https://cdn.shopify.com https://fonts.googleapis.com https://fonts.gstatic.com https://fonts.shopifycdn.com; style-src 'self' 'unsafe-inline' https://cdn.shopify.com https://fonts.googleapis.com https://fonts.shopifycdn.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://www.facebook.com https://analytics.tiktok.com https://tr.snapchat.com https://tr.pinterest.com https://tr.taboola.com https://tr.kwai.com https://www.hillteck.com https://monorail-edge.shopifysvc.com https://extensions.shopifycdn.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss: ws: https://monorail-edge.shopifysvc.com https://extensions.shopifycdn.com https://cdn.shopify.com; frame-src 'self' https://cdn.shopify.com https://extensions.shopifycdn.com;"
  };

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    console.log("🔄 Handling preflight request");
    return new Response(null, { status: 200, headers });
  }

  const url = new URL(request.url);
  const wilayaIdParam = url.searchParams.get("wilaya_id");

  console.log("🔍 Parsed URL:", url.toString());
  console.log("🔍 Wilaya ID param:", wilayaIdParam);

  try {
    console.log("🔍 Checking database connection...");
    
    // Test database connection first
    const testQuery = await db.algeriaCities.count();
    console.log(`✅ Database connected. Total records: ${testQuery}`);
    
    // If a `wilaya_id` is provided, fetch communes for that specific wilaya
    if (wilayaIdParam) {
      console.log(`🔍 Fetching communes for wilaya_id: ${wilayaIdParam}`);
      
      const communes = await db.algeriaCities.findMany({
        where: {
          wilaya_code: wilayaIdParam.padStart(2, "0"),
        },
        select: {
          id: true,
          commune_name: true,
          commune_name_ascii: true,
          daira_name: true,
          daira_name_ascii: true,
          wilaya_code: true,
          wilaya_name: true,
          wilaya_name_ascii: true,
        },
        orderBy: {
          commune_name_ascii: "asc",
        },
      });

      console.log(`✅ Found ${communes.length} communes for wilaya ${wilayaIdParam}`);
      return json(communes, { headers });
    }

    // Otherwise, fetch the unique list of all wilayas
    console.log("🔍 Fetching all wilayas");
    
    const wilayasData = await db.algeriaCities.groupBy({
      by: ["wilaya_code", "wilaya_name", "wilaya_name_ascii"],
      orderBy: {
        wilaya_code: "asc",
      },
    });

    const wilayas = wilayasData.map((w) => ({
      id: parseInt(w.wilaya_code, 10),
      wilaya_code: w.wilaya_code,
      wilaya_name: w.wilaya_name.trim(),
      wilaya_name_ascii: w.wilaya_name_ascii.trim(),
    }));

    console.log(`✅ Found ${wilayas.length} wilayas`);
    return json(wilayas, { headers });
  } catch (error) {
    console.error("❌ Error fetching Algeria locations:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error
    });
    
    // Return fallback data instead of error to prevent form failures
    console.log("🔄 Returning fallback wilaya data");
    const fallbackWilayas = [
      { id: 1, wilaya_code: "01", wilaya_name: "Adrar", wilaya_name_ascii: "Adrar" },
      { id: 2, wilaya_code: "02", wilaya_name: "Chlef", wilaya_name_ascii: "Chlef" },
      { id: 3, wilaya_code: "03", wilaya_name: "Laghouat", wilaya_name_ascii: "Laghouat" },
      { id: 4, wilaya_code: "04", wilaya_name: "Oum El Bouaghi", wilaya_name_ascii: "Oum El Bouaghi" },
      { id: 5, wilaya_code: "05", wilaya_name: "Batna", wilaya_name_ascii: "Batna" },
      { id: 6, wilaya_code: "06", wilaya_name: "Béjaïa", wilaya_name_ascii: "Bejaia" },
      { id: 7, wilaya_code: "07", wilaya_name: "Biskra", wilaya_name_ascii: "Biskra" },
      { id: 8, wilaya_code: "08", wilaya_name: "Béchar", wilaya_name_ascii: "Bechar" },
      { id: 9, wilaya_code: "09", wilaya_name: "Blida", wilaya_name_ascii: "Blida" },
      { id: 10, wilaya_code: "10", wilaya_name: "Bouira", wilaya_name_ascii: "Bouira" },
      { id: 11, wilaya_code: "11", wilaya_name: "Tamanrasset", wilaya_name_ascii: "Tamanrasset" },
      { id: 12, wilaya_code: "12", wilaya_name: "Tébessa", wilaya_name_ascii: "Tebessa" },
      { id: 13, wilaya_code: "13", wilaya_name: "Tlemcen", wilaya_name_ascii: "Tlemcen" },
      { id: 14, wilaya_code: "14", wilaya_name: "Tiaret", wilaya_name_ascii: "Tiaret" },
      { id: 15, wilaya_code: "15", wilaya_name: "Tizi Ouzou", wilaya_name_ascii: "Tizi Ouzou" },
      { id: 16, wilaya_code: "16", wilaya_name: "Alger", wilaya_name_ascii: "Alger" },
      { id: 17, wilaya_code: "17", wilaya_name: "Djelfa", wilaya_name_ascii: "Djelfa" },
      { id: 18, wilaya_code: "18", wilaya_name: "Jijel", wilaya_name_ascii: "Jijel" },
      { id: 19, wilaya_code: "19", wilaya_name: "Sétif", wilaya_name_ascii: "Setif" },
      { id: 20, wilaya_code: "20", wilaya_name: "Saïda", wilaya_name_ascii: "Saida" }
    ];
    
    return json(fallbackWilayas, { headers });
  }
};