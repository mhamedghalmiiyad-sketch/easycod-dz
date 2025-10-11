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

    // Use the correctly defined variable NOEST_API_URL
    const response = await fetch(NOEST_API_URL, {
        method: 'POST', 
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            api_token: apiToken,
            user_guid: userGuid,
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Noest API Error: ${response.status}`, errorText);
        throw new Error(`Noest API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const feesObject = data.tarifs?.delivery || {};
    deliveryFees = Object.values(feesObject);

} else if (apiProvider === 'ecotrack') {
    // Validate that the required parameters are present.
    if (!apiUrl) {
        return json({ error: "API URL is required for EcoTrack" }, { status: 400 });
    }
    if (!userGuid) {
        return json({ error: "User GUID is required for EcoTrack" }, { status: 400 });
    }

    // Construct the correct URL based on the "dhd one" API documentation.
    const ECOTRACK_FEES_URL = `${apiUrl}/api/public/fees`;

    const response = await fetch(ECOTRACK_FEES_URL, {
        method: 'POST', // Use POST method
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            api_token: apiToken,
            user_guid: userGuid, // Send api_token and user_guid in the body
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`EcoTrack API Error: ${response.status}`, errorText);
        throw new Error(`EcoTrack API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    // The response structure is the same as Noest's.
    const feesObject = data.tarifs?.delivery || {};
    deliveryFees = Object.values(feesObject);
}

    return json({ success: true, rates: deliveryFees });

  } catch (error: any) {
    console.error("API Import Error:", error.message);
    return json({ error: error.message }, { status: 500 });
  }
};
