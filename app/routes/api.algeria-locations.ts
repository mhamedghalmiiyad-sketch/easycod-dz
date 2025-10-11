// File: app/routes/api.algeria-locations.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const wilayaIdParam = url.searchParams.get("wilaya_id");

  try {
    // If a `wilaya_id` is provided, fetch communes for that specific wilaya
    if (wilayaIdParam) {
      console.log(`Fetching communes for wilaya_id: ${wilayaIdParam}`);
      
      const communes = await db.algeriaCities.findMany({
        where: {
          wilaya_code: wilayaIdParam.padStart(2, "0"),
        },
        select: {
          id: true,
          commune_name: true,
          commune_name_ascii: true,
          daira_name: true,
          daira_name_ascii: true,
          wilaya_code: true,
          wilaya_name: true,
          wilaya_name_ascii: true,
        },
        orderBy: {
          commune_name_ascii: "asc",
        },
      });

      console.log(`Found ${communes.length} communes for wilaya ${wilayaIdParam}`);
      return json(communes);
    }

    // Otherwise, fetch the unique list of all wilayas
    console.log("Fetching all wilayas");
    
    const wilayasData = await db.algeriaCities.groupBy({
      by: ["wilaya_code", "wilaya_name", "wilaya_name_ascii"],
      orderBy: {
        wilaya_code: "asc",
      },
    });

    const wilayas = wilayasData.map((w) => ({
      id: parseInt(w.wilaya_code, 10),
      wilaya_code: w.wilaya_code,
      wilaya_name: w.wilaya_name.trim(),
      wilaya_name_ascii: w.wilaya_name_ascii.trim(),
    }));

    console.log(`Found ${wilayas.length} wilayas`);
    return json(wilayas);
  } catch (error) {
    console.error("Error fetching Algeria locations:", error);
    return json({ error: "Failed to fetch locations." }, { status: 500 });
  }
};
