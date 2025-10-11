// File: app/routes/api.algeria-locations.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * NOTE: To use this loader, you must have the `algeria_cities` table
 * in your Prisma schema (`prisma/schema.prisma`).
 *
 * Add this model to your schema.prisma file:
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
 * Then, run `npx prisma db push` and `npx prisma generate` to update your Prisma client.
 * Your model will be available at `db.algeria_cities`.
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Authentication is retained to ensure this endpoint is protected within the Shopify admin.
  await authenticate.admin(request);

  const url = new URL(request.url);
  const wilayaIdParam = url.searchParams.get("wilaya_id");

  try {
    // If a `wilaya_id` is provided, fetch the communes for that specific wilaya.
    if (wilayaIdParam) {
      const communes = await db.algeriaCities.findMany({
        where: {
          // Use padStart to ensure the code is always two digits (e.g., '1' becomes '01').
          wilaya_code: wilayaIdParam.padStart(2, "0"),
        },
        select: {
          id: true,
          commune_name: true,
          commune_name_ascii: true,
        },
        orderBy: {
          commune_name_ascii: "asc",
        },
      });

      return json(communes);
    }

    // If no `wilaya_id` is provided, fetch the unique list of all wilayas.
    const wilayasData = await db.algeriaCities.groupBy({
      by: ["wilaya_code", "wilaya_name", "wilaya_name_ascii"],
      orderBy: {
        wilaya_code: "asc",
      },
    });

    // Map the grouped data to a clean format.
    const wilayas = wilayasData.map(
      (w: {
        wilaya_code: string;
        wilaya_name: string;
        wilaya_name_ascii: string;
      }) => ({
        id: parseInt(w.wilaya_code, 10),
        wilaya_code: w.wilaya_code,
        wilaya_name: w.wilaya_name.trim(),
        wilaya_name_ascii: w.wilaya_name_ascii.trim(),
      })
    );

    return json(wilayas);
  } catch (error) {
    console.error("Error in algeria-locations loader:", error);
    return json({ error: "Failed to fetch Algeria locations." }, { status: 500 });
  }
};