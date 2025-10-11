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

const MAYSTRO_TARGET_COMMUNES = {
  1: { id: 1, name: "Adrar", wilaya_name: "Adrar" },
  2: { id: 29, name: "Chlef", wilaya_name: "Chlef" },
  3: { id: 82, name: "Aflou", wilaya_name: "Laghouat" },
  4: { id: 113, name: "Oum El Bouaghi", wilaya_name: "Oum El Bouaghi" },
  5: { id: 142, name: "Batna", wilaya_name: "Batna" },
  6: { id: 181, name: "Bejaia", wilaya_name: "Bejaia" },
  7: { id: 224, name: "Biskra", wilaya_name: "Biskra" },
  8: { id: 258, name: "Bechar", wilaya_name: "Bechar" },
  9: { id: 300, name: "Blida", wilaya_name: "Blida" },
  10: { id: 326, name: "Bouira", wilaya_name: "Bouira" },
  11: { id: 354, name: "Tamanrasset", wilaya_name: "Tamanrasset" },
  12: { id: 385, name: "Tebessa", wilaya_name: "Tebessa" },
  13: { id: 412, name: "Tlemcen", wilaya_name: "Tlemcen" },
  14: { id: 461, name: "Tiaret", wilaya_name: "Tiaret" },
  15: { id: 501, name: "Tizi Ouzou", wilaya_name: "Tizi Ouzou" },
  16: { id: 582, name: "Alger Centre", wilaya_name: "Alger" },
  17: { id: 620, name: "Djelfa", wilaya_name: "Djelfa" },
  18: { id: 659, name: "Jijel", wilaya_name: "Jijel" },
  19: { id: 718, name: "Setif", wilaya_name: "Setif" },
  20: { id: 743, name: "Saida", wilaya_name: "Saida" },
  21: { id: 761, name: "Skikda", wilaya_name: "Skikda" },
  22: { id: 807, name: "Sidi Bel Abbes", wilaya_name: "Sidi Bel Abbes" },
  23: { id: 851, name: "Annaba", wilaya_name: "Annaba" },
  24: { id: 875, name: "Guelma", wilaya_name: "Guelma" },
  25: { id: 894, name: "Constantine", wilaya_name: "Constantine" },
  26: { id: 930, name: "Medea", wilaya_name: "Medea" },
  27: { id: 966, name: "Mostaganem", wilaya_name: "Mostaganem" },
  28: { id: 1000, name: "M'Sila", wilaya_name: "M'Sila" },
  29: { id: 1052, name: "Mascara", wilaya_name: "Mascara" },
  30: { id: 1081, name: "Ouargla", wilaya_name: "Ouargla" },
  31: { id: 1137, name: "Oran", wilaya_name: "Oran" },
  32: { id: 1142, name: "El Bayadh", wilaya_name: "El Bayadh" },
  34: { id: 1162, name: "Bordj Bou Arreridj", wilaya_name: "Bordj Bou Arreridj" },
  35: { id: 1205, name: "Boudouaou", wilaya_name: "Boumerdes" },
  36: { id: 1224, name: "El Tarf", wilaya_name: "El Tarf" },
  37: { id: 1254, name: "Tindouf", wilaya_name: "Tindouf" },
  38: { id: 1267, name: "Tissemsilt", wilaya_name: "Tissemsilt" },
  39: { id: 1294, name: "El Oued", wilaya_name: "El Oued" },
  40: { id: 1324, name: "Khenchela", wilaya_name: "Khenchela" },
  41: { id: 1345, name: "Souk Ahras", wilaya_name: "Souk Ahras" },
  42: { id: 1370, name: "Tipaza", wilaya_name: "Tipaza" },
  43: { id: 1386, name: "Mila", wilaya_name: "Mila" },
  44: { id: 1413, name: "Ain Defla", wilaya_name: "Ain Defla" },
  45: { id: 1458, name: "Naama", wilaya_name: "Naama" },
  46: { id: 1468, name: "Ain Temouchent", wilaya_name: "Ain Temouchent" },
  47: { id: 1493, name: "Ghardaia", wilaya_name: "Ghardaia" },
  48: { id: 1526, name: "Relizane", wilaya_name: "Relizane" },
  49: { id: 19, name: "Timimoun", wilaya_name: "Timimoun" },
  51: { id: 235, name: "Ouled Djellal", wilaya_name: "Ouled Djellal" },
  52: { id: 269, name: "Beni Abbes", wilaya_name: "Beni Abbes" },
  53: { id: 364, name: "In Saleh", wilaya_name: "In Saleh" },
  55: { id: 1083, name: "Touggourt", wilaya_name: "Touggourt" },
  57: { id: 1305, name: "Djamaa", wilaya_name: "El M'ghaier" },
  58: { id: 1492, name: "El Meniaa", wilaya_name: "El Meniaa" },
};

// Map for provider URLs to centralize endpoint management.
const PROVIDER_URLS: Record<string, string> = {
  maystro: 'https://backend.maystro-delivery.com',
  dhd: 'https://platform.dhd-dz.com',
  anderson: 'https://anderson.ecotrack.dz',
  areex: 'https://areex.ecotrack.dz',
  baconsult: 'https://bacexpress.ecotrack.dz',
  conexlog: 'https://app.conexlog-dz.com',
  coyoteexpress: 'https://coyoteexpressdz.ecotrack.dz',
  distazero: 'https://distazero.ecotrack.dz',
  '48hr': 'https://48hr.ecotrack.dz',
  fretdirect: 'https://fret.ecotrack.dz',
  golivri: 'https://golivri.ecotrack.dz',
  msmgo: 'https://msmgo.ecotrack.dz',
  packers: 'https://packers.ecotrack.dz',
  prest: 'https://prest.ecotrack.dz',
  rex: 'https://rex.ecotrack.dz',
  rocket: 'https://rocket.ecotrack.dz',
  salva: 'https://salvadelivery.ecotrack.dz',
  speed: 'https://speeddelivery.ecotrack.dz',
  tsl: 'https://tsl.ecotrack.dz',
};


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

      // Specific implementation for Maystro
      c      case "maystro": {
        const baseUrl = PROVIDER_URLS[apiProvider];
        console.log(`Fetching rates from Maystro...`);

        // Explicitly type the return of the async map function to Promise<DeliveryRate | null>
        const deliveryRatesPromises = Object.entries(MAYSTRO_TARGET_COMMUNES).map(async ([wilayaId, communeInfo]): Promise<DeliveryRate | null> => {
          try {
            // Fetch home delivery price and stop desk price concurrently
            const [homeResponse, stopDeskResponse] = await Promise.all([
              fetch(`${baseUrl}/api/stores/delivery_price/?commune=${communeInfo.id}&delivery_type=1`, {
                headers: { "Authorization": `Token ${apiToken}` },
              }),
              fetch(`${baseUrl}/api/stores/delivery_price/?commune=${communeInfo.id}&delivery_type=2`, {
                headers: { "Authorization": `Token ${apiToken}` },
              }),
            ]);

            const homeData = homeResponse.ok ? await homeResponse.json() : null;
            const stopDeskData = stopDeskResponse.ok ? await stopDeskResponse.json() : null;

            const wilayaInfo = wilayaInfoMap.get(parseInt(wilayaId));

            // Create an object that explicitly conforms to the DeliveryRate interface
            const rate: DeliveryRate = {
              wilaya_id: parseInt(wilayaId),
              wilaya_name_fr: wilayaInfo?.name_fr ?? communeInfo.wilaya_name,
              wilaya_name_ar: wilayaInfo?.name_ar ?? `ولاية ${wilayaId}`,
              tarif: homeData?.delivery_price || 0,
              tarif_stopdesk: stopDeskData?.delivery_price || 0,
            };
            return rate;

          } catch (error: any) {
            console.error(`Error fetching Maystro rates for wilaya ${wilayaId}:`, error.message);
            return null; // Return null on error to filter out later
          }
        });

        const results = await Promise.all(deliveryRatesPromises);
        // This filter now works correctly because `results` is of type (DeliveryRate | null)[]
        deliveryRates = results.filter((rate): rate is DeliveryRate => rate !== null);
        break;
      }

      // All EcoTrack-based APIs fall through to this logic
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
        // Get the base URL from our map, or use the one passed for the generic 'ecotrack' option
        const baseUrl = PROVIDER_URLS[apiProvider] || url.searchParams.get("apiUrl");

        if (!baseUrl) {
          return json(
            { error: `API URL for provider '${apiProvider}' is not configured.` },
            { status: 400 }
          );
        }

        const API_URL = `${baseUrl}/api/v1/get/fees`;
        console.log(`Fetching rates from ${apiProvider} via ${API_URL}...`);

        const response = await fetch(API_URL, {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${apiToken}`,
          },
        });

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