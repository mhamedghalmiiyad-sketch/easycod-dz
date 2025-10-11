import fs from "fs";
import path from "path";

const localesDir = path.resolve("app/locales");
const languages = ["en", "ar", "fr"];
const namespaces = ["common", "dashboard", "settings", "navigation", "language"];

/**
 * Deep merge helper: adds missing keys but does not overwrite existing ones
 */
function deepMerge(base: any, target: any): any {
  if (!target) target = {};
  
  for (const key in base) {
    if (!(key in target)) {
      // If the base value is an object, create an empty object and recursively merge
      if (typeof base[key] === "object" && base[key] !== null && !Array.isArray(base[key])) {
        target[key] = deepMerge(base[key], {});
      } else {
        // Use English fallback instead of empty string to prevent raw key paths
        target[key] = `[EN] ${base[key]}`;
      }
    } else if (
      typeof base[key] === "object" &&
      base[key] !== null &&
      !Array.isArray(base[key])
    ) {
      target[key] = deepMerge(base[key], target[key] || {});
    }
  }
  return target;
}

function syncNamespace(ns: string) {
  const enFile = path.join(localesDir, `${ns}.en.json`);
  if (!fs.existsSync(enFile)) {
    console.warn(`⚠️ Missing English base file for namespace: ${ns}`);
    return;
  }

  const base = JSON.parse(fs.readFileSync(enFile, "utf-8"));

  for (const lang of languages) {
    const file = path.join(localesDir, `${ns}.${lang}.json`);

    if (!fs.existsSync(file)) {
      // create file if missing
      fs.writeFileSync(file, JSON.stringify({}, null, 2), "utf-8");
    }

    const target = JSON.parse(fs.readFileSync(file, "utf-8"));
    const updated = deepMerge(base, target);

    fs.writeFileSync(file, JSON.stringify(updated, null, 2), "utf-8");
    console.log(`✅ Synced ${ns}.${lang}.json`);
  }
}

function main() {
  console.log("🔄 Starting translation sync...");
  
  for (const ns of namespaces) {
    syncNamespace(ns);
  }
  
  console.log("✨ Translation sync complete!");
  console.log("\n📝 Next steps:");
  console.log("1. Review the generated files for missing translations");
  console.log("2. Replace '[EN] ...' with proper translations");
  console.log("3. The [EN] prefix prevents raw key paths from showing in your UI");
}

main();
