import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * This route handles session token validation for embedded apps
 * Both GET (loader) and POST (action) requests are supported
 */

// ADD THIS LOADER - This was missing and causing the error
export const loader = async (args: LoaderFunctionArgs) => {
  console.log("--- DEBUG: /auth/session-token loader (GET) triggered ---");
  
  try {
    // Validate the session using the standard authenticate.admin method
    const { session } = await authenticate.admin(args);
    
    return json({ 
      success: true,
      message: "Session token validated successfully",
      shop: session.shop
    });
  } catch (error) {
    console.error("Session token validation failed (GET):", error);
    
    return json(
      { 
        success: false, 
        error: "Invalid session token" 
      },
      { status: 401 }
    );
  }
};

// Keep the existing action for POST requests
export const action = async (args: ActionFunctionArgs) => {
  console.log("--- DEBUG: /auth/session-token action (POST) triggered ---");
  
  try {
    // Validate the session using the standard authenticate.admin method
    const { session } = await authenticate.admin(args);
    
    return json({ 
      success: true,
      message: "Session token validated successfully",
      shop: session.shop
    });
  } catch (error) {
    console.error("Session token validation failed (POST):", error);
    
    return json(
      { 
        success: false, 
        error: "Invalid session token" 
      },
      { status: 401 }
    );
  }
};
