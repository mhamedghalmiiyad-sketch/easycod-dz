// File: app/routes/api.import-rates.ts

import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// Define a type for the API response for better safety
interface DeliveryFee {
  wilaya_id: number;
  tarif: string;
  tarif_stopdesk: string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  // Authenticate to ensure only logged-in admins can use this
  const { session } = await authenticate.admin(request);
  if (!session) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const apiProvider = formData.get("apiProvider") as string;
  const apiUrl = formData.get("apiUrl") as string;
  const apiToken = formData.get("apiToken") as string;
  const userGuid = formData.get("userGuid") as string;

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

      const noestFormData = new FormData();
      noestFormData.append('api_token', apiToken);
      noestFormData.append('user_guid', userGuid);

      const response = await fetch(NOEST_API_URL, {
        method: 'POST',
        body: noestFormData,
      });

      if (!response.ok) {
        throw new Error(`Noest API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // The Noest API nests the data under `tarifs.delivery`
      const feesObject = data.tarifs?.delivery || {};
      deliveryFees = Object.values(feesObject);

    } else if (apiProvider === 'ecotrack') {
      const ECOTRACK_API_URL = `${apiUrl || 'https://app.ecotrack.dz'}/api/v1/get/fees`;
      
      // EcoTrack uses a GET request, so no body is needed
      const response = await fetch(ECOTRACK_API_URL);

      if (!response.ok) {
        throw new Error(`EcoTrack API Error: ${response.status} ${response.statusText}`);
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