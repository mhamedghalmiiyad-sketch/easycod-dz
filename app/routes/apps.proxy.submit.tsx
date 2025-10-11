import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

// Handle app proxy submit requests
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    console.log("🎯 apps.proxy.submit ACTION handler called");
    console.log("🔍 Request URL:", request.url);
    console.log("🔍 Request method:", request.method);
    
    // Forward to the main submit handler
    console.log("🔄 Forwarding to submit handler");
    // Import the submit handler dynamically to avoid circular imports
    const { action: submitAction } = await import("./submit");
    
    // Call the submit action directly
    return await submitAction({ request, params: {}, context: {} });
  } catch (error) {
    console.error("❌ Proxy submit error:", error);
    console.error("🔥 Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    // Return a proper JSON error response
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : "An unexpected error occurred" 
    }, { status: 500 });
  }
};
