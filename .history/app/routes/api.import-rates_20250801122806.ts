a// File: app/routes/api.import-rates.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// Constant for Algeria wilayas data
const algeriaWilayas = [
  { code: '01', name_ar: 'أدرار', name_fr: 'Adrar' },
  { code: '02', name_ar: 'الشلف', name_fr: 'Chlef' },
  { code: '03', name_ar: 'الأغواط', name_fr: 'Laghouat' },
  { code: '04', name_ar: 'أم البواقي', name_fr: 'Oum El Bouaghi' },
  { code: '05', name_ar: 'باتنة', name_fr: 'Batna' },
  { code: '06', name_ar: 'بجاية', name_fr: 'Béjaïa' },
  { code: '07', name_ar: 'بسكرة', name_fr: 'Biskra' },
  { code: '08', name_ar: 'بشار', name_fr: 'Béchar' },
  { code: '09', name_ar: 'البليدة', name_fr: 'Blida' },
  { code: '10', name_ar: 'البويرة', name_fr: 'Bouira' },
  { code: '11', name_ar: 'تمنراست', name_fr: 'Tamanrasset' },
  { code: '12', name_ar: 'تبسة', name_fr: 'Tébessa' },
  { code: '13', name_ar: 'تلمسان', name_fr: 'Tlemcen' },
  { code: '14', name_ar: 'تيارت', name_fr: 'Tiaret' },
  { code: '15', name_ar: 'تيزي وزو', name_fr: 'Tizi Ouzou' },
  { code: '16', name_ar: 'الجزائر', name_fr: 'Alger' },
  { code: '17', name_ar: 'الجلفة', name_fr: 'Djelfa' },
  { code: '18', name_ar: 'جيجل', name_fr: 'Jijel' },
  { code: '19', name_ar: 'سطيف', name_fr: 'Sétif' },
  { code: '20', name_ar: 'سعيدة', name_fr: 'Saïda' },
  { code: '21', name_ar: 'سكيكدة', name_fr: 'Skikda' },
  { code: '22', name_ar: 'سيدي بلعباس', name_fr: 'Sidi Bel Abbès' },
  { code: '23', name_ar: 'عنابة', name_fr: 'Annaba' },
  { code: '24', name_ar: 'قالمة', name_fr: 'Guelma' },
  { code: '25', name_ar: 'قسنطينة', name_fr: 'Constantine' },
  { code: '26', name_ar: 'المدية', name_fr: 'Médéa' },
  { code: '27', name_ar: 'مستغانم', name_fr: 'Mostaganem' },
  { code: '28', name_ar: 'المسيلة', name_fr: 'M\'Sila' },
  { code: '29', name_ar: 'معسكر', name_fr: 'Mascara' },
  { code: '30', name_ar: 'ورقلة', name_fr: 'Ouargla' },
  { code: '31', name_ar: 'وهران', name_fr: 'Oran' },
  { code: '32', name_ar: 'البيض', name_fr: 'El Bayadh' },
  { code: '33', name_ar: 'إليزي', name_fr: 'Illizi' },
  { code: '34', name_ar: 'برج بوعريريج', name_fr: 'Bordj Bou Arréridj' },
  { code: '35', name_ar: 'بومرداس', name_fr: 'Boumerdès' },
  { code: '36', name_ar: 'الطارف', name_fr: 'El Tarf' },
  { code: '37', name_ar: 'تندوف', name_fr: 'Tindouf' },
  { code: '38', name_ar: 'تيسمسيلت', name_fr: 'Tissemsilt' },
  { code: '39', name_ar: 'الوادي', name_fr: 'El Oued' },
  { code: '40', name_ar: 'خنشلة', name_fr: 'Khenchela' },
  { code: '41', name_ar: 'سوق أهراس', name_fr: 'Souk Ahras' },
  { code: '42', name_ar: 'تيبازة', name_fr: 'Tipaza' },
  { code: '43', name_ar: 'ميلة', name_fr: 'Mila' },
  { code: '44', name_ar: 'عين الدفلى', name_fr: 'Aïn Defla' },
  { code: '45', name_ar: 'النعامة', name_fr: 'Naâma' },
  { code: '46', name_ar: 'عين تموشنت', name_fr: 'Aïn Témouchent' },
  { code: '47', name_ar: 'غرداية', name_fr: 'Ghardaïa' },
  { code: '48', name_ar: 'غليزان', name_fr: 'Relizane' },
  { code: '49', name_ar: 'تيميمون', name_fr: 'Timimoun' },
  { code: '50', name_ar: 'برج باجي مختار', name_fr: 'Bordj Badji Mokhtar' },
  { code: '51', name_ar: 'أولاد جلال', name_fr: 'Ouled Djellal' },
  { code: '52', name_ar: 'بني عباس', name_fr: 'Béni Abbès' },
  { code: '53', name_ar: 'عين صالح', name_fr: 'In Salah' },
  { code: '54', name_ar: 'عين قزام', name_fr: 'In Guezzam' },
  { code: '55', name_ar: 'توقرت', name_fr: 'Touggourt' },
  { code: '56', name_ar: 'جانت', name_fr: 'Djanet' },
  { code: '57', name_ar: 'المغير', name_fr: 'El M\'Ghair' },
  { code: '58', name_ar: 'المنيعة', name_fr: 'El Meniaa' }
];

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
  // Create a lookup map for efficient retrieval of both French and Arabic names.
  const wilayaInfoMap = new Map<number, { name_fr: string; name_ar: string }>(
    algeriaWilayas.map(w => [
      parseInt(w.code, 10),
      { name_fr: w.name_fr, name_ar: w.name_ar },
    ])
  );

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

      case "ecotrack": {
        console.log("Fetching rates from EcoTrack...");
        const apiUrl = url.searchParams.get("apiUrl") || "https://app.ecotrack.dz";
        const ECOTRACK_API_URL = `${apiUrl}/api/v1/get/fees`;
        
        console.log("EcoTrack API URL:", ECOTRACK_API_URL);
        console.log("API Token (first 10 chars):", apiToken.substring(0, 10) + "...");

        const response = await fetch(ECOTRACK_API_URL, {
            method: 'GET',
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiToken}`,
            },
        });

        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`EcoTrack API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const livraisonRates = data.livraison ?? [];

        // Map the EcoTrack response to our standard format
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
