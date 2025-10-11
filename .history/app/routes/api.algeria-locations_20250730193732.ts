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
    // 1. Fetch the pricing data from shop settings
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
      // It's possible settings aren't configured yet, return an empty array
      // so the frontend can handle it gracefully.
      return json([]);
    }

    const logisticsSettings = logisticsField.settings as LogisticsDeliverySettings;
    const deliveryRates: DeliveryRate[] = logisticsSettings.manualRates || [];

    // Create a quick lookup map for prices using the wilaya_code as the key
    const priceMap = new Map<string, { homeDeliveryPrice: number; stopDeskPrice: number }>();
    deliveryRates.forEach(rate => {
      // The `wilayaId` from settings corresponds to `wilaya_code`
      priceMap.set(String(rate.wilayaId), {
        homeDeliveryPrice: rate.homeDeliveryPrice,
        stopDeskPrice: rate.stopDeskPrice,
      });
    });

    // 2. Fetch the unique list of Wilayas from the database
    const wilayasData = await db.algeria_cities.groupBy({
      by: ['wilaya_code', 'wilaya_name', 'wilaya_name_ascii'],
      orderBy: { wilaya_code: 'asc' },
    });

    // 3. Merge the pricing data with the Wilayas list
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
    console.error("Database query error for Algeria locations:", error);
    return json({ error: "Failed to fetch locations." }, { status: 500 });
  }
};