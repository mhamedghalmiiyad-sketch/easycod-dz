// File: app/routes/api.import-rates.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { wilayaInfoMap } from "../utils/algeria-locations.server";

// Define a standard interface for delivery rates to ensure consistency.
interface DeliveryRate {
  wilaya_id: number;
  wilaya_name_fr: string;
  wilaya_name_ar: string;
  home_fee?: number;
  desk_fee?: number;
  tarif?: number;
  tarif_stopdesk?: number;
}

/**
 * Loader function to handle GET requests for importing delivery rates from third-party APIs.
 * It authenticates the admin user and fetches data based on the specified provider.
 *
 * @param {LoaderFunctionArgs} { request } - The request object from Remix.
 * @returns {Promise<Response>} A JSON response with the imported rates or an error.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 1. Authenticate the request to ensure it's from a logged-in admin.
  const { session } = await authenticate.admin(request);
  if (!session) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Extract API credentials and provider from the request URL.
  const url = new URL(request.url);
  const apiProvider = url.searchParams.get("apiProvider");
  const apiToken = url.searchParams.get("apiToken");
  const userGuid = url.searchParams.get("userGuid"); // Specific to Noest

  if (!apiProvider || !apiToken) {
    return json(
      { error: "Missing required parameters: apiProvider and apiToken" },
      { status: 400 }
    );
  }

  try {
    let deliveryRates: DeliveryRate[] = [];

    // 3. Use a switch statement to handle different API providers.
    switch (apiProvider) {
      case "noest": {
        if (!userGuid) {
          return json(
            { error: "User GUID is required for Noest provider" },
            { status: 400 }
          );
        }

        console.log("Fetching rates from Noest...");
        const NOEST_API_URL = "https://app.noest-dz.com/api/public/fees";
        const params = new URLSearchParams({
          api_token: apiToken,
          user_guid: userGuid,
        });

        const response = await fetch(`${NOEST_API_URL}?${params.toString()}`);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Noest API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const feesObject: Record<string, any> = data.tarifs?.delivery ?? {};

        // Map the Noest response to our standard format
        deliveryRates = Object.values(feesObject).map((fee: any) => {
          const wilayaInfo = wilayaInfoMap.get(fee.wilaya_id);
          return {
            wilaya_id: fee.wilaya_id,
            wilaya_name_fr: wilayaInfo?.name_fr ?? fee.name,
            wilaya_name_ar: wilayaInfo?.name_ar ?? `ولاية ${fee.wilaya_id}`,
            tarif: parseFloat(fee.tarif),
            tarif_stopdesk: parseFloat(fee.tarif_stopdesk),
          };
        });
        break;
      }

      case "ecotrack":
      case "dhd":
      case "anderson":
      case "areex":
      case "baconsult":
      case "conexlog":
      case "coyoteexpress":
      case "distazero":
      case "48hr":
      case "fretdirect":
      case "golivri":
      case "msmgo":
      case "packers":
      case "prest":
      case "rex":
      case "rocket":
      case "salva":
      case "speed":
      case "tsl": {
        console.log(`Fetching rates from ${apiProvider}...`);
        const apiUrl = url.searchParams.get("apiUrl");

        if (!apiUrl) {
          return json(
            { error: "API URL is required for this provider" },
            { status: 400 }
          );
        }

        const API_URL = `${apiUrl}/api/v1/get/fees`;

        console.log(`${apiProvider} API URL:`, API_URL);
        console.log("API Token (first 10 chars):", apiToken.substring(0, 10) + "...");

        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiToken}`,
            },
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`${apiProvider} API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const livraisonRates = data.livraison ?? [];

        // Map the response to our standard format
        deliveryRates = livraisonRates.map((rate: any) => {
          const wilayaInfo = wilayaInfoMap.get(rate.wilaya_id);
          return {
            wilaya_id: rate.wilaya_id,
            wilaya_name_fr: wilayaInfo?.name_fr ?? `Wilaya ${rate.wilaya_id}`,
            wilaya_name_ar: wilayaInfo?.name_ar ?? `ولاية ${rate.wilaya_id}`,
            tarif: parseFloat(rate.tarif),
            tarif_stopdesk: parseFloat(rate.tarif_stopdesk),
          };
        });
        break;
      }

      default:
        return json(
          { error: `Unsupported API provider: ${apiProvider}` },
          { status: 400 }
        );
    }

    // 4. Transform the rates to match the expected frontend format
    const formattedRates = deliveryRates.map(rate => ({
      wilaya_id: rate.wilaya_id,
      wilaya_name_fr: rate.wilaya_name_fr,
      wilaya_name_ar: rate.wilaya_name_ar,
      tarif: rate.tarif || rate.home_fee, // Handle both formats
      tarif_stopdesk: rate.tarif_stopdesk || rate.desk_fee, // Handle both formats
    }));

    console.log(`Successfully imported ${formattedRates.length} rates for ${apiProvider}.`);
    return json({ success: true, rates: formattedRates });

  } catch (error: any) {
    // 5. Catch any errors during the process and return a server error response.
    console.error("API Import Failed:", error.message);
    return json({ error: error.message }, { status: 500 });
  }
};
