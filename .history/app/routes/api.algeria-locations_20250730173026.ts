// File: app/routes/api.algeria-locations.ts

import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { parseJsonField } from "~/utils/shopSettings";
// Make sure this path is correct for your project structure
import type { LogisticsDeliverySettings, FormField } from "./routes/app.form-designer.tsx";

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
  const wilayaId = url.searchParams.get("wilaya_id");

  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId: session.shop },
    select: { formFields: true },
  });

  if (!shopSettings) {
    return json({ error: "Settings not found" }, { status: 404 });
  }

 const formFields: FormField[] = parseJsonField(shopSettings.formFields, []);
  const logisticsField = formFields.find(
    (f: any) => f.type === "logistics-delivery"
  );

  if (!logisticsField) {
    return json(
      { error: "Logistics settings not configured." },
      { status: 400 }
    );
  }

  const logisticsSettings = logisticsField.settings as LogisticsDeliverySettings;

  if (logisticsSettings.apiProvider === "manual") {
    // For manual rates, return the rates saved in the settings
    const rates = logisticsSettings.manualRates || [];
    return json(rates);
  } else {
    // For API providers, fetch data from the local database
    try {
      if (wilayaId) {
        // A specific Wilaya ID is provided, so fetch its Communes
        const communes = await db.algeria_cities.findMany({
          where: { wilaya_code: wilayaId },
          select: {
            id: true,
            commune_name: true,
            commune_name_ascii: true,
          },
          orderBy: {
            commune_name_ascii: 'asc',
          },
        });
        return json(communes);
      } else {
        // No Wilaya ID, so fetch the distinct list of all Wilayas
        const wilayasData = await db.algeria_cities.groupBy({
          by: ['wilaya_code', 'wilaya_name', 'wilaya_name_ascii'],
          orderBy: {
            wilaya_code: 'asc',
          },
        });

        // Map the grouped data to a cleaner format { id, name, name_ascii }
        const wilayas = wilayasData.map(w => ({
            id: w.wilaya_code,
            wilaya_name: w.wilaya_name.trim(), // Trim whitespace from some names
            wilaya_name_ascii: w.wilaya_name_ascii,
        }));

        return json(wilayas);
      }
    } catch (error) {
      console.error("Database query error for Algeria locations:", error);
      return json(
        { error: "Failed to fetch locations from the database." },
        { status: 500 }
      );
    }
  }
};