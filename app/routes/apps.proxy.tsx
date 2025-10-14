import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

// Handle app proxy requests
export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("🎯 apps.proxy ACTION handler called");
  console.log("🔍 Request URL:", request.url);
  console.log("🔍 Request method:", request.method);
  
  // Get request body if it exists
  let body;
  try {
    body = await request.text();
    console.log("🔍 Request body:", body);
  } catch (error) {
    console.log("🔍 No request body or error reading body:", error);
  }
  
  // Get all search parameters
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  console.log("🔍 Search parameters:", searchParams);
  
  // Check if this is a recovery request
  if (searchParams.recovery) {
    console.log("🔄 Handling cart recovery request");
    // Forward to recovery handler
    const { action: recoveryAction } = await import("./apps.proxy.track-abandonment");
    return await recoveryAction({ request, params: {}, context: {} });
  }
  
  // Forward POST requests to the submit handler
  console.log("🔄 Forwarding POST request to submit handler");
  
  // Import the submit handler dynamically to avoid circular imports
  const { action: submitAction } = await import("./submit");
  
  // Create a new request for the submit route
  const submitUrl = new URL("/submit", url.origin);
  submitUrl.search = url.search; // Copy all search parameters
  
  const submitRequest = new Request(submitUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: body || undefined,
  });
  
  console.log("✅ Forwarding to submit handler");
  
  try {
    // Call the submit action directly
    return await submitAction({ request: submitRequest, params: {}, context: {} });
  } catch (error) {
    console.error("❌ Error in submit handler:", error);
    // If it's an app not installed error, return a more user-friendly response
    if (error instanceof Error && error.message.includes("App not installed")) {
      return json({
        success: false,
        error: "This app needs to be installed first. Please contact the store administrator.",
        installRequired: true
      }, { status: 403 });
    }
    throw error;
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("🎯 apps.proxy LOADER handler called");
  console.log("🔍 Request URL:", request.url);
  console.log("🔍 Request method:", request.method);
  
  // Get all search parameters
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  console.log("🔍 Search parameters:", searchParams);
  
  // Return a simple response for GET requests
  return json({
    success: true,
    message: "App proxy GET request received",
    timestamp: new Date().toISOString(),
    path: url.pathname,
    method: request.method,
    searchParams
  });
};
