import fs from "fs";
import path from "path";

const localesDir = path.resolve("app/locales");
const languages = ["en", "ar", "fr"];
const namespaces = ["common", "dashboard", "settings", "navigation", "language"];

// Configuration
const MARK_MISSING = process.argv.includes("--mark-missing");
const MISSING_PREFIX = "__MISSING__";

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
        // Mark missing translations with prefix if flag is set
        target[key] = MARK_MISSING ? `${MISSING_PREFIX}${base[key]}` : "";
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
    if (lang === "en") continue; // Skip English as it's the source

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
  
  if (MARK_MISSING) {
    console.log(`📝 Marking missing translations with prefix: ${MISSING_PREFIX}`);
  }
  
  for (const ns of namespaces) {
    syncNamespace(ns);
  }
  
  console.log("✨ Translation sync complete!");
  console.log("\n📝 Next steps:");
  console.log("1. Review the generated files for missing translations");
  console.log("2. Fill in the empty strings with proper translations");
  
  if (MARK_MISSING) {
    console.log(`3. Look for strings prefixed with "${MISSING_PREFIX}" - these need translation`);
    console.log("4. Remove the prefix after translating");
  } else {
    console.log("3. Consider running with --mark-missing flag to highlight untranslated strings");
  }
}

main();
