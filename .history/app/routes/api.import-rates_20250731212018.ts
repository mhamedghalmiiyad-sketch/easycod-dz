// File: app/routes/api.import-rates.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// Define a type for the API response for better safety
interface DeliveryFee {
  wilaya_id: number;
  tarif: string;
  tarif_stopdesk: string;
}

// Use a 'loader' to handle GET requests from the frontend fetcher
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Authenticate to ensure only logged-in admins can use this
  const { session } = await authenticate.admin(request);
  if (!session) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }

  // For a loader (GET request), read parameters from the URL search params
  const url = new URL(request.url);
  const apiProvider = url.searchParams.get("apiProvider");
  const apiUrl = url.searchParams.get("apiUrl");
  const apiToken = url.searchParams.get("apiToken");
  const userGuid = url.searchParams.get("userGuid");

  if (!apiProvider || !apiToken) {
    return json({ error: "Missing API provider or token" }, { status: 400 });
  }

  try {
    let deliveryFees: DeliveryFee[] = [];

    if (apiProvider === 'noest') {
  // Define the correct URL for NOEST
  const NOEST_API_URL = 'https://app.noest-dz.com/api/public/fees';
  
  if (!userGuid) {
      return json({ error: "User GUID is required for Noest" }, { status: 400 });
  }

  // Build query parameters for GET request
  const params = new URLSearchParams({
      api_token: apiToken,
      user_guid: userGuid,
  });

  // Use GET method with query parameters
  const response = await fetch(`${NOEST_API_URL}?${params.toString()}`, {
      method: 'GET', // Changed from POST to GET
      headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
      },
      // Removed body since GET requests don't have a body
  });

  if (!response.ok) {
      const errorText = await response.text();
      console.error(`Noest API Error: ${response.status}`, errorText);
      throw new Error(`Noest API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const feesObject = data.tarifs?.delivery || {};
  deliveryFees = Object.values(feesObject);
}

     } else if (apiProvider === 'ecotrack') {
      // EcoTrack doesn't have a dedicated fees endpoint
      // We need to use a different approach or return a message
      return json({ 
          error: "EcoTrack API doesn't provide a fees endpoint. Please configure manual rates or use Noest instead." 
      }, { status: 400 });
    }

    // This return is now correctly inside the 'try' block
    return json({ success: true, rates: deliveryFees });

  } catch (error: any) {
    console.error("API Import Error:", error.message);
    return json({ error: error.message }, { status: 500 });
  }
};
