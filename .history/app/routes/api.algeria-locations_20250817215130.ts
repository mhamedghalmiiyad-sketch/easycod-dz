// File: app/routes/api.algeria-locations.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
// ⛔️ DO NOT import `authenticate`
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 🗑️ REMOVED THIS LINE: await authenticate.admin(request);

  const url = new URL(request.url);
  const wilayaIdParam = url.searchParams.get("wilaya_id");

  try {
    // If a `wilaya_id` is provided, fetch communes
    if (wilayaIdParam) {
      const communes = await db.algeriaCities.findMany({
        where: {
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

    // Otherwise, fetch the unique list of all wilayas
    const wilayasData = await db.algeriaCities.groupBy({
      by: ["wilaya_code", "wilaya_name", "wilaya_name_ascii"],
      orderBy: {
        wilaya_code: "asc",
      },
    });

    const wilayas = wilayasData.map((w: { wilaya_code: string; wilaya_name: string; wilaya_name_ascii: string; }) => ({
      id: parseInt(w.wilaya_code, 10),
      wilaya_code: w.wilaya_code,
      wilaya_name: w.wilaya_name.trim(),
      wilaya_name_ascii: w.wilaya_name_ascii.trim(),
    }));

    return json(wilayas);
  } catch (error) {
    console.error("Error fetching Algeria locations:", error);
    return json({ error: "Failed to fetch locations." }, { status: 500 });
  }
};