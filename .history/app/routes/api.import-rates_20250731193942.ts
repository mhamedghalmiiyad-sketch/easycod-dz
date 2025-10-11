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
      const NOEST_API_URL = 'https://app.noest-dz.com/api/public/fees';
      
      if (!userGuid) {
        return json({ error: "User GUID is required for Noest" }, { status: 400 });
      }

      // The Noest public API expects a POST request with a JSON body.
      // We will use a POST request here as required by the external service.
      const response = await fetch(NOEST_API_URL, {
        method: 'POST', // Correctly using POST as per Noest API requirements
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
      // The Noest API nests the data under `tarifs.delivery`
      const feesObject = data.tarifs?.delivery || {};
      deliveryFees = Object.values(feesObject);

    } else if (apiProvider === 'ecotrack') {
      // Construct the correct URL for the EcoTrack API
      const ECOTRACK_API_URL = `${apiUrl || 'https://app.ecotrack.dz'}/api/rates`;
      
      const response = await fetch(ECOTRACK_API_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text(); 
        console.error(`EcoTrack API Error: ${response.status}`, errorText);
        throw new Error(`EcoTrack API Error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      // The EcoTrack API has data under the 'livraison' key
      deliveryFees = data.livraison || [];
    }

    return json({ success: true, rates: deliveryFees });

  } catch (error: any) {
    console.error("API Import Error:", error.message);
    return json({ error: error.message }, { status: 500 });
  }
};
