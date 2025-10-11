# Translation Sync Scripts

This directory contains scripts to help manage i18n translations and prevent missing translation keys from showing raw key paths in your app.

## Scripts

### 1. `sync-translations.ts` - Basic Sync

The basic translation sync script that:
- Uses English files as the source of truth
- Adds missing keys to Arabic and French files with empty strings
- Never overwrites existing translations
- Creates missing JSON files if they don't exist
- Handles nested object structures properly

**Usage:**
```bash
npm run sync:i18n
```

### 2. `sync-translations-enhanced.ts` - Enhanced with Missing Markers

The enhanced version that:
- Does everything the basic script does
- Marks missing translations with `__MISSING__` prefix when using `--mark-missing` flag
- Makes it easier to spot untranslated strings in the UI during testing

**Usage:**
```bash
# Basic sync (same as above)
npm run sync:i18n

# Sync with missing markers
npm run sync:i18n:missing
```

### 3. `fix-missing-translations.ts` - Fix Raw Key Paths

The fix script that:
- Replaces empty strings (`""`) with English fallbacks (`[EN] English text`)
- Prevents raw key paths like `dashboard:title` from showing in your UI
- Uses `[EN]` prefix to make it easy to identify what needs translation

**Usage:**
```bash
npm run fix:translations
```

## How It Works

1. **Source of Truth**: English files (e.g., `dashboard.en.json`) are used as the reference
2. **Deep Merge**: The script recursively merges the English structure into Arabic and French files
3. **Preservation**: Existing translations are never overwritten
4. **Stub Generation**: Missing keys get empty strings or `__MISSING__` prefixed values
5. **File Creation**: Missing translation files are automatically created

## Example

If you add this to `dashboard.en.json`:
```json
{
  "setupSteps": {
    "newStep": {
      "title": "New cool step",
      "description": "Do this to finish setup"
    }
  }
}
```

Running `npm run sync:i18n` will add this stub to `dashboard.ar.json`:
```json
{
  "setupSteps": {
    "newStep": {
      "title": "",
      "description": ""
    }
  }
}
```

Running `npm run sync:i18n:missing` will add this to `dashboard.ar.json`:
```json
{
  "setupSteps": {
    "newStep": {
      "title": "__MISSING__New cool step",
      "description": "__MISSING__Do this to finish setup"
    }
  }
}
```

## Workflow

1. **Add new English keys** to your locale files
2. **Run the sync script** to generate stubs for other languages
3. **Fill in translations** for the empty strings or remove `__MISSING__` prefixes
4. **Test your app** to ensure no raw key paths appear

## Supported Languages

- English (`en`) - Source of truth
- Arabic (`ar`) - Target language
- French (`fr`) - Target language

## Supported Namespaces

- `common` - Common translations
- `dashboard` - Dashboard-specific translations
- `settings` - Settings page translations
- `navigation` - Navigation translations
- `language` - Language selector translations

## Common Issues & Solutions

### Raw Key Paths Showing in UI

**Problem:** You see `dashboard:title` or `settings.general.orderProcessing.description` instead of actual text.

**Cause:** Empty strings (`""`) in translation files cause i18next to fall back to displaying the raw key path.

**Solution:** Run the fix script to replace empty strings with English fallbacks:
```bash
npm run fix:translations
```

This will change:
```json
{
  "title": "",
  "subtitle": ""
}
```

To:
```json
{
  "title": "[EN] COD Manager Dashboard",
  "subtitle": "[EN] Manage your Cash on Delivery settings"
}
```

## Tips

- Use `npm run sync:i18n:missing` during development to easily spot missing translations
- Remove `__MISSING__` prefixes after translating
- Run the sync script whenever you add new English keys
- Use `npm run fix:translations` if you see raw key paths in your UI
- Replace `[EN] ...` with proper translations when ready
- Consider adding this to your CI/CD pipeline to catch missing translations early
