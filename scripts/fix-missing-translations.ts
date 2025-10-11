import fs from "fs";
import path from "path";

const localesDir = path.resolve("app/locales");
const languages = ["ar", "fr"]; // Target languages (not English)
const namespaces = ["common", "dashboard", "settings", "navigation", "language"];

/**
 * Deep merge helper: replaces empty strings with English fallbacks
 */
function fixMissingTranslations(base: any, target: any): any {
  if (!target) target = {};
  
  for (const key in base) {
    if (!(key in target)) {
      // If the base value is an object, create an empty object and recursively merge
      if (typeof base[key] === "object" && base[key] !== null && !Array.isArray(base[key])) {
        target[key] = fixMissingTranslations(base[key], {});
      } else {
        // Use English text as fallback instead of empty string
        target[key] = `[EN] ${base[key]}`;
      }
    } else if (typeof target[key] === "string" && target[key] === "") {
      // Replace empty strings with English fallback
      target[key] = `[EN] ${base[key]}`;
    } else if (
      typeof base[key] === "object" &&
      base[key] !== null &&
      !Array.isArray(base[key])
    ) {
      target[key] = fixMissingTranslations(base[key], target[key] || {});
    }
  }
  return target;
}

function fixNamespace(ns: string) {
  const enFile = path.join(localesDir, `${ns}.en.json`);
  if (!fs.existsSync(enFile)) {
    console.warn(`⚠️ Missing English base file for namespace: ${ns}`);
    return;
  }

  const base = JSON.parse(fs.readFileSync(enFile, "utf-8"));

  for (const lang of languages) {
    const file = path.join(localesDir, `${ns}.${lang}.json`);

    if (!fs.existsSync(file)) {
      console.warn(`⚠️ Missing translation file: ${ns}.${lang}.json`);
      continue;
    }

    const target = JSON.parse(fs.readFileSync(file, "utf-8"));
    const updated = fixMissingTranslations(base, target);

    fs.writeFileSync(file, JSON.stringify(updated, null, 2), "utf-8");
    console.log(`✅ Fixed missing translations in ${ns}.${lang}.json`);
  }
}

function main() {
  console.log("🔧 Fixing missing translations with English fallbacks...");
  console.log("📝 This will replace empty strings with [EN] prefixed English text");
  console.log("🎯 This prevents raw key paths from showing in your UI\n");
  
  for (const ns of namespaces) {
    fixNamespace(ns);
  }
  
  console.log("\n✨ Translation fix complete!");
  console.log("\n📝 Next steps:");
  console.log("1. Your app should no longer show raw key paths like 'dashboard:title'");
  console.log("2. You'll see '[EN] English text' instead of empty strings");
  console.log("3. Replace '[EN] ...' with proper translations when ready");
  console.log("4. The [EN] prefix makes it easy to find what needs translation");
}

main();
