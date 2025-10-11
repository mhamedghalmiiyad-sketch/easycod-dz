// File: app/routes/api.algeria-locations.ts

import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { parseJsonField } from "~/utils/shopSettings";
// Make sure this path is correct for your project structure and includes DeliveryRate
import type { LogisticsDeliverySettings, FormField, DeliveryRate } from "~/routes/app.form-designer";

/**
 * NOTE: To use this updated loader, you must add the `algeria_cities` table
 * to your Prisma schema (`prisma/schema.prisma`) like this:
 *
* model algeria_cities {
 * id                 Int    @id
 * commune_name       String @db.VarChar(255)
 * commune_name_ascii String @db.VarChar(255)
 * daira_name         String @db.VarChar(255)
 * daira_name_ascii   String @db.VarChar(255)
 * wilaya_code        String @db.VarChar(4)
 * wilaya_name        String @db.VarChar(255)
 * wilaya_name_ascii  String @db.VarChar(255)
 * }
 *
 * Then, run `npx prisma db pull` and `npx prisma generate` to update your Prisma Client.
 */

// Interface for the external Noest API response
interface NoestFee {
  wilaya_id: number;
  tarif: string;
  tarif_stopdesk: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const wilayaIdParam = url.searchParams.get("wilaya_id");

  // If a specific wilaya_id is provided, fetch and return its communes.
  // This logic is for populating the communes dropdown when a wilaya is selected.
  if (wilayaIdParam) {
    try {
      const communes = await db.algeria_cities.findMany({
        where: { wilaya_code: wilayaIdParam },
        select: { id: true, commune_name: true, commune_name_ascii: true },
        orderBy: { commune_name_ascii: 'asc' },
      });
      return json(communes);
    } catch (error) {
      console.error("Database query error for communes:", error);
      return json({ error: "Failed to fetch communes." }, { status: 500 });
    }
  }

  // If no wilaya_id is provided, fetch the full list of wilayas
  // and merge it with the pricing data from the shop settings.
  try {
    // 1. Fetch the shop settings to determine the pricing provider
    const shopSettings = await db.shopSettings.findUnique({
      where: { shopId: session.shop },
      select: { formFields: true },
    });

    if (!shopSettings) {
      return json({ error: "Settings not found" }, { status: 404 });
    }

    const formFields: FormField[] = parseJsonField(shopSettings.formFields, []);
    const logisticsField = formFields.find(f => f.type === "logistics-delivery");

    if (!logisticsField) {
      // It's possible settings aren't configured yet, return an empty array.
      return json([]);
    }

    const logisticsSettings = logisticsField.settings as LogisticsDeliverySettings;
    const priceMap = new Map<string, { homeDeliveryPrice: number; stopDeskPrice: number }>();

    // 2. Conditional Logic: Fetch prices based on the selected provider
    if (logisticsSettings.apiProvider === 'noest') {
      // --- A) FETCH FROM NOEST API ---
      const NOEST_API_URL = 'https://noest-api.com/api/v1/get/fees'; // The API endpoint
      const NOEST_API_TOKEN = logisticsSettings.apiToken;       // Get token from settings

      if (!NOEST_API_TOKEN) {
         return json({ error: "Noest API Token is not configured." }, { status: 400 });
      }

      const response = await fetch(NOEST_API_URL, {
        headers: {
          'Authorization': `Bearer ${NOEST_API_TOKEN}`, // Use Bearer token authentication
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        // Log the actual error from the API for easier debugging
        const errorBody = await response.text();
        console.error(`Failed to fetch from Noest API: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`Failed to fetch from Noest API: ${response.statusText}`);
      }

      const feesResponse = await response.json();
      const deliveryFees: NoestFee[] = feesResponse.livraison || [];

      deliveryFees.forEach(fee => {
        priceMap.set(String(fee.wilaya_id), {
          homeDeliveryPrice: parseFloat(fee.tarif) || 0,
          stopDeskPrice: parseFloat(fee.tarif_stopdesk) || 0,
        });
      });

    } else {
      // --- B) USE MANUAL RATES (The original logic) ---
      const deliveryRates: DeliveryRate[] = logisticsSettings.manualRates || [];
      deliveryRates.forEach(rate => {
        // The `wilayaId` from settings corresponds to `wilaya_code`
        priceMap.set(String(rate.wilayaId), {
          homeDeliveryPrice: rate.homeDeliveryPrice,
          stopDeskPrice: rate.stopDeskPrice,
        });
      });
    }

    // 3. Fetch the unique list of Wilayas from the local database
    const wilayasData = await db.algeria_cities.groupBy({
      by: ['wilaya_code', 'wilaya_name', 'wilaya_name_ascii'],
      orderBy: { wilaya_code: 'asc' },
    });

    // 4. Merge the pricing data (from either source) with the Wilayas list
    const wilayasWithPrices = wilayasData.map(w => {
      const prices = priceMap.get(w.wilaya_code) || { homeDeliveryPrice: 0, stopDeskPrice: 0 };
      return {
        id: parseInt(w.wilaya_code, 10), // The component might expect a number ID
        wilaya_code: w.wilaya_code,
        wilaya_name: w.wilaya_name.trim(),
        wilaya_name_ascii: w.wilaya_name_ascii.trim(),
        homeDeliveryPrice: prices.homeDeliveryPrice,
        stopDeskPrice: prices.stopDeskPrice,
      };
    });

    return json(wilayasWithPrices);

  } catch (error) {
    console.error("Error in algeria-locations loader:", error);
    return json({ error: "Failed to fetch locations." }, { status: 500 });
  }
};