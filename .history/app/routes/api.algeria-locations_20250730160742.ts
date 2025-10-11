// File: app/routes/api.algeria-locations.ts

import { json, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { parseJsonField } from "~/utils/shopSettings";
// Make sure this path is correct for your project structure
import type { LogisticsDeliverySettings, FormField } from "~/routes/app._index";


/**
 * MOCK FUNCTION: Replace this with your actual API calls.
 * This function should interact with Noest, EcoTrack, or any other provider
 * based on the saved settings.
 */
async function fetchFromLogisticsApi(settings: LogisticsDeliverySettings, wilayaId?: string) {
    console.log(`Fetching from API provider: ${settings.apiProvider}`);
    
    // Example: You would use settings.apiToken, settings.userGuid, etc. here
    // const API_URL = settings.apiUrl || 'https://api.noest-dz.com/v1/...';
    // const response = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${settings.apiToken}` }});
    // const data = await response.json();
    // return data;

    // --- MOCK DATA FOR DEMONSTRATION ---
    // If fetching communes for a specific wilaya
    if (wilayaId) {
        // MOCK: return communes for Alger (ID 16)
        if (wilayaId === '16') {
            return [
                { id: 1601, commune_name: 'الجزائر الوسطى', commune_name_ascii: 'Alger Centre' },
                { id: 1602, commune_name: 'سيدي امحمد', commune_name_ascii: 'Sidi M\'Hamed' },
                { id: 1610, commune_name: 'حسين داي', commune_name_ascii: 'Hussein Dey' },
            ];
        }
        return []; // Return empty for other wilayas in this example
    }

    // MOCK: return all wilayas
    return [
        { id: 1, wilaya_name: 'أدرار', wilaya_name_ascii: 'Adrar', homeDeliveryPrice: 800, stopDeskPrice: 500 },
        { id: 9, wilaya_name: 'البليدة', wilaya_name_ascii: 'Blida', homeDeliveryPrice: 400, stopDeskPrice: 250 },
        { id: 16, wilaya_name: 'الجزائر', wilaya_name_ascii: 'Alger', homeDeliveryPrice: 350, stopDeskPrice: 200 },
        { id: 31, wilaya_name: 'وهران', wilaya_name_ascii: 'Oran', homeDeliveryPrice: 500, stopDeskPrice: 300 },
        { id: 35, wilaya_name: 'بومرداس', wilaya_name_ascii: 'Boumerdes', homeDeliveryPrice: 400, stopDeskPrice: 250 },
        // ... a real API would return all 58 wilayas
    ];
}


export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const url = new URL(request.url);
    const wilayaId = url.searchParams.get("wilaya_id");

    const shopSettings = await db.shopSettings.findUnique({
        where: { shopId: session.shop },
        select: { formFields: true },
    });

    if (!shopSettings) {
        return json({ error: "Settings not found" }, { status: 404 });
    }

    const formFields: FormField[] = parseJsonField(shopSettings.formFields) || [];
    const logisticsField = formFields.find((f: any) => f.type === 'logistics-delivery');

    if (!logisticsField) {
        return json({ error: "Logistics settings not configured." }, { status: 400 });
    }

    const logisticsSettings = logisticsField.settings as LogisticsDeliverySettings;

    if (logisticsSettings.apiProvider === 'manual') {
        // For manual rates, return the rates saved in the settings
        const rates = logisticsSettings.manualRates || [];
        return json(rates);
    } else {
        // For API providers, fetch live data
        try {
            const data = await fetchFromLogisticsApi(logisticsSettings, wilayaId || undefined);
            return json(data);
        } catch (error) {
            console.error("Logistics API Error:", error);
            return json({ error: "Failed to fetch from the logistics API." }, { status: 500 });
        }
    }
};