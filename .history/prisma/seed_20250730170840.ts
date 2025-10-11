// prisma/seed.ts

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Your SQL data converted to a JavaScript array of objects
const citiesData = [
  { id: 22, commune_name: "تيمقتن", commune_name_ascii: "Timekten", daira_name: "أولف", daira_name_ascii: "Aoulef", wilaya_code: "01", wilaya_name: "أدرار", wilaya_name_ascii: "Adrar" },
  { id: 6, commune_name: "بودة", commune_name_ascii: "Bouda", daira_name: "أدرار", daira_name_ascii: "Adrar", wilaya_code: "01", wilaya_name: "أدرار", wilaya_name_ascii: "Adrar" },
  { id: 13, commune_name: "أولاد أحمد تيمي", commune_name_ascii: "Ouled Ahmed Timmi", daira_name: "أدرار", daira_name_ascii: "Adrar", wilaya_code: "01", wilaya_name: "أدرار", wilaya_name_ascii: "Adrar" },
  { id: 1, commune_name: "أدرار", commune_name_ascii: "Adrar", daira_name: "أدرار", daira_name_ascii: "Adrar", wilaya_code: "01", wilaya_name: "أدرار", wilaya_name_ascii: "Adrar" },
  // ... (all other 1500+ entries go here) ...
  // NOTE: To avoid an extremely long response, only a few examples are shown.
  // The full data from your SQL file should be converted to this object format.
  // A simple find-and-replace or a small script can automate this conversion.
  // For example, using a text editor with regex:
  // Find: INSERT INTO algeria_cities\(.*?\) VALUES \((.*?)\);
  // Replace: { id: $1, commune_name: $2, ... },
  { id: 1495, commune_name: 'المنيعة', commune_name_ascii: 'El Meniaa', daira_name: 'المنيعة', daira_name_ascii: 'El Menia', wilaya_code: '58', wilaya_name: 'المنيعة', wilaya_name_ascii: 'El Menia' },
  { id: 1499, commune_name: 'حاسي القارة', commune_name_ascii: 'Hassi Gara', daira_name: 'المنيعة', daira_name_ascii: 'El Menia', wilaya_code: '58', wilaya_name: 'المنيعة', wilaya_name_ascii: 'El Menia' },
  { id: 1498, commune_name: 'حاسي الفحل', commune_name_ascii: 'Hassi Fehal', daira_name: 'المنصورة', daira_name_ascii: 'Mansourah', wilaya_code: '58', wilaya_name: 'المنيعة', wilaya_name_ascii: 'El Menia' }
];

async function main() {
  console.log(`Start seeding ...`);

  // Using createMany for efficient bulk insertion
  const result = await prisma.algeria_cities.createMany({
    data: citiesData,
    skipDuplicates: true, // Optional: useful if the script is run multiple times
  });

  console.log(`Seeding finished. Added ${result.count} cities.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });