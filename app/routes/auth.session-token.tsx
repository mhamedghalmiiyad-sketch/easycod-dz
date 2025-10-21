import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { shopify } from "../shopify.server"; // <-- Import 'shopify' NOT 'authenticate'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("--- DEBUG: /auth/session-token loader (GET) triggered ---");
  try {
    // This is the correct method for this route
    const { session } = await shopify.authenticate.public.sessionToken({
      request,
    });

    if (!session) {
      console.log("--- DEBUG: Session token invalid or expired ---");
      return json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    console.log("--- DEBUG: Session token validated successfully ---");
    return json({ success: true, shop: session.shop });
  } catch (error: any) {
    console.error("--- ERROR: /auth/session-token validation error ---", error);
    return json(
      { success: false, error: error.message || "Validation failed" },
      { status: 401 }
    );
  }
};

// We can use the same logic for the action, just in case
export const action = async ({ request }: LoaderFunctionArgs) => {
  console.log("--- DEBUG: /auth/session-token action (POST) triggered ---");
  try {
    // This is the correct method for this route
    const { session } = await shopify.authenticate.public.sessionToken({
      request,
    });

    if (!session) {
      console.log("--- DEBUG: Session token invalid or expired ---");
      return json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    console.log("--- DEBUG: Session token validated successfully ---");
    return json({ success: true, shop: session.shop });
  } catch (error: any) {
    console.error("--- ERROR: /auth/session-token validation error ---", error);
    return json(
      { success: false, error: error.message || "Validation failed" },
      { status: 401 }
    );
  }
};

// This route MUST NOT export a default component.
// It is an API-only route.
