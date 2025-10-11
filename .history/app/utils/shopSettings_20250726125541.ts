// utils/shopSettings.ts
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// A default object for general settings, can be imported from a shared file
const DEFAULT_GENERAL_SETTINGS = {
  orderCreationMode: "cod",
  saveUtmParameters: true,
  disableShopifyDiscounts: false,
  disableAutofill: false,
  trimLeadingZeroPhone: false,
  addOrderTag: true,
  redirectMode: "shopify",
  redirectUrl: "",
  whatsappRedirectPhone: "",
  whatsappRedirectMessage: "Hello, I have just completed my order!",
  customThankYouMessage: "Thank you for your order! We will contact you shortly to confirm.",
  enableTaxes: false,
  taxRate: "0",
  taxCountries: [],
  taxName: "VAT",
  taxIsIncluded: false,
};

/**
 * Initializes settings for a new shop if they don't already exist.
 * This includes default shop settings, general settings, and app proxy settings.
 * @param {string} shopId - The ID of the shop to initialize.
 */
export async function initializeShopSettings(shopId: string) {
  try {
    // Check if shop settings already exist to prevent overwriting.
    const existing = await prisma.shopSettings.findUnique({
      where: { shopId },
    });

    // If no settings exist, create them with default values.
    if (!existing) {
      await prisma.shopSettings.create({
        data: {
          shopId,
          formFields: "[]",
          formStyle: "{}",
          pixelSettings: "{}",
          visibilityMode: "all",
          visibleProducts: "[]",
          // Initialize generalSettings with the default configuration.
          generalSettings: JSON.stringify(DEFAULT_GENERAL_SETTINGS),
        },
      });
    } else if (!existing.generalSettings) {
        // If settings exist but generalSettings is missing, update the record.
        await prisma.shopSettings.update({
            where: { shopId },
            data: {
                generalSettings: JSON.stringify(DEFAULT_GENERAL_SETTINGS),
            },
        });
    }


    // Initialize app proxy settings if they don't exist.
    const existingProxy = await prisma.appProxy.findUnique({
      where: { shopId },
    });

    if (!existingProxy) {
      await prisma.appProxy.create({
        data: {
          shopId,
          isEnabled: true,
          configuration: "{}",
        },
      });
    }

    console.log(`Shop settings initialized for ${shopId}`);
  } catch (error) {
    console.error(`Error initializing shop settings for ${shopId}:`, error);
  }
}

/**
 * Retrieves the raw shop settings from the database.
 * @param {string} shopId - The ID of the shop.
 * @returns The shopSettings object or null if not found.
 */
export async function getShopSettings(shopId: string) {
  return await prisma.shopSettings.findUnique({
    where: { shopId },
  });
}

/**
 * Retrieves the raw app proxy settings from the database.
 * @param {string} shopId - The ID of the shop.
 * @returns The appProxy object or null if not found.
 */
export async function getAppProxySettings(shopId: string) {
  return await prisma.appProxy.findUnique({
    where: { shopId },
  });
}

// --- JSON HELPER FUNCTIONS ---

/**
 * Safely parses a JSON string into a TypeScript type.
 * @param {string | null} jsonString - The JSON string to parse.
 * @param {T} fallback - The fallback value if parsing fails.
 * @returns {T} The parsed object or the fallback.
 */
export function parseJsonField<T>(jsonString: string | null | undefined, fallback: T): T {
  if (jsonString === null || jsonString === undefined) {
    return fallback;
  }
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Safely stringifies an object into a JSON string.
 * @param data - The data to stringify.
 * @returns {string} The JSON string or "{}" if stringification fails.
 */
export function stringifyJsonField(data: any): string {
  try {
    return JSON.stringify(data);
  } catch {
    return "{}";
  }
}

// --- UPDATE/UPSERT FUNCTIONS ---

type ShopSettingsUpdates = {
  formFields?: any;
  formStyle?: any;
  pixelSettings?: any;
  visibilityMode?: string;
  visibleProducts?: any[];
  generalSettings?: any;
};

/**
 * Updates existing shop settings with proper JSON handling.
 * @param {string} shopId - The ID of the shop to update.
 * @param {ShopSettingsUpdates} updates - The fields to update.
 */
export async function updateShopSettings(shopId: string, updates: ShopSettingsUpdates) {
  const data: Prisma.ShopSettingsUpdateInput = {};

  if (updates.formFields !== undefined) data.formFields = stringifyJsonField(updates.formFields);
  if (updates.formStyle !== undefined) data.formStyle = stringifyJsonField(updates.formStyle);
  if (updates.pixelSettings !== undefined) data.pixelSettings = stringifyJsonField(updates.pixelSettings);
  if (updates.visibilityMode !== undefined) data.visibilityMode = updates.visibilityMode;
  if (updates.visibleProducts !== undefined) data.visibleProducts = stringifyJsonField(updates.visibleProducts);
  if (updates.generalSettings !== undefined) data.generalSettings = stringifyJsonField(updates.generalSettings);

  return await prisma.shopSettings.update({
    where: { shopId },
    data,
  });
}

/**
 * Creates or updates shop settings.
 * @param {string} shopId - The ID of the shop.
 * @param {ShopSettingsUpdates} updates - The fields to upsert.
 */
export async function upsertShopSettings(shopId: string, updates: ShopSettingsUpdates) {
    const updateData: Prisma.ShopSettingsUpdateInput = {};
    if (updates.formFields !== undefined) updateData.formFields = stringifyJsonField(updates.formFields);
    if (updates.formStyle !== undefined) updateData.formStyle = stringifyJsonField(updates.formStyle);
    if (updates.pixelSettings !== undefined) updateData.pixelSettings = stringifyJsonField(updates.pixelSettings);
    if (updates.visibilityMode !== undefined) updateData.visibilityMode = updates.visibilityMode;
    if (updates.visibleProducts !== undefined) updateData.visibleProducts = stringifyJsonField(updates.visibleProducts);
    if (updates.generalSettings !== undefined) updateData.generalSettings = stringifyJsonField(updates.generalSettings);

    const createData = {
        formFields: updates.formFields !== undefined ? stringifyJsonField(updates.formFields) : "[]",
        formStyle: updates.formStyle !== undefined ? stringifyJsonField(updates.formStyle) : "{}",
        pixelSettings: updates.pixelSettings !== undefined ? stringifyJsonField(updates.pixelSettings) : "{}",
        visibilityMode: updates.visibilityMode || "all",
        visibleProducts: updates.visibleProducts !== undefined ? stringifyJsonField(updates.visibleProducts) : "[]",
        generalSettings: updates.generalSettings !== undefined ? stringifyJsonField(updates.generalSettings) : JSON.stringify(DEFAULT_GENERAL_SETTINGS),
    };

    return await prisma.shopSettings.upsert({
        where: { shopId },
        update: updateData,
        create: createData,
    });
}


type AppProxyUpdates = {
  isEnabled?: boolean;
  configuration?: any;
};

/**
 * Updates app proxy settings.
 * @param {string} shopId - The ID of the shop.
 * @param {AppProxyUpdates} updates - The fields to update.
 */
export async function updateAppProxySettings(shopId: string, updates: AppProxyUpdates) {
  const data: Prisma.AppProxyUpdateInput = {};
  if (updates.isEnabled !== undefined) data.isEnabled = updates.isEnabled;
  if (updates.configuration !== undefined) data.configuration = stringifyJsonField(updates.configuration);

  return await prisma.appProxy.update({
    where: { shopId },
    data,
  });
}

/**
 * Creates or updates app proxy settings.
 * @param {string} shopId - The ID of the shop.
 * @param {AppProxyUpdates} updates - The fields to upsert.
 */
export async function upsertAppProxySettings(shopId: string, updates: AppProxyUpdates) {
  const updateData: Prisma.AppProxyUpdateInput = {};
  if (updates.isEnabled !== undefined) updateData.isEnabled = updates.isEnabled;
  if (updates.configuration !== undefined) updateData.configuration = stringifyJsonField(updates.configuration);

  const createData = {
      shopId, // Add shopId to the create payload to satisfy Prisma's type requirement.
      isEnabled: updates.isEnabled ?? true,
      configuration: updates.configuration !== undefined ? stringifyJsonField(updates.configuration) : "{}",
  };

  return await prisma.appProxy.upsert({
    where: { shopId },
    update: updateData,
    create: createData,
  });
}


// --- PARSED GETTER FUNCTIONS ---

/**
 * Gets shop settings with all JSON fields parsed into objects.
 * @param {string} shopId - The ID of the shop.
 * @returns The parsed settings object or null if not found.
 */
export async function getParsedShopSettings(shopId: string) {
  const settings = await getShopSettings(shopId);
  if (!settings) return null;

  return {
    ...settings,
    formFields: parseJsonField(settings.formFields, []),
    formStyle: parseJsonField(settings.formStyle, {}),
    pixelSettings: parseJsonField(settings.pixelSettings, {}),
    visibleProducts: parseJsonField(settings.visibleProducts, []),
    generalSettings: parseJsonField(settings.generalSettings, DEFAULT_GENERAL_SETTINGS),
  };
}

/**
 * Gets app proxy settings with the configuration field parsed.
 * @param {string} shopId - The ID of the shop.
 * @returns The parsed settings object or null if not found.
 */
export async function getParsedAppProxySettings(shopId: string) {
  const settings = await getAppProxySettings(shopId);
  if (!settings) return null;

  return {
    ...settings,
    configuration: parseJsonField(settings.configuration, {}),
  };
}


// --- SPECIFIC HELPER FUNCTIONS ---

/**
 * Gets only the general settings for a shop.
 * @param {string} shopId - The ID of the shop.
 * @returns The parsed general settings object.
 */
export async function getGeneralSettings(shopId: string) {
    const settings = await prisma.shopSettings.findUnique({
        where: { shopId },
        select: { generalSettings: true },
    });
    return parseJsonField(settings?.generalSettings, DEFAULT_GENERAL_SETTINGS);
}

/**
 * Updates only the general settings for a shop.
 * @param {string} shopId - The ID of the shop.
 * @param {object} generalSettings - The new general settings object.
 */
export async function updateGeneralSettings(shopId: string, generalSettings: object) {
    return await prisma.shopSettings.update({
        where: { shopId },
        data: {
            generalSettings: stringifyJsonField(generalSettings),
        },
    });
}

/**
 * Gets the visibility settings for the form.
 * @param {string} shopId - The ID of the shop.
 * @returns An object with visibilityMode and visibleProducts.
 */
export async function getVisibilitySettings(shopId: string) {
  try {
    const settings = await prisma.shopSettings.findUnique({
      where: { shopId },
      select: { visibilityMode: true, visibleProducts: true },
    });

    if (!settings) {
      return { visibilityMode: "all", visibleProducts: [] };
    }

    return {
      visibilityMode: settings.visibilityMode || "all",
      visibleProducts: parseJsonField(settings.visibleProducts, []),
    };
  } catch (error) {
    console.error("Error getting visibility settings:", error);
    return { visibilityMode: "all", visibleProducts: [] };
  }
}

/**
 * Updates the visibility settings for a shop.
 * @param {string} shopId - The ID of the shop.
 * @param {string} visibilityMode - The new visibility mode.
 * @param {any[]} visibleProducts - The array of visible products.
 */
export async function updateVisibilitySettings(shopId: string, visibilityMode: string, visibleProducts: any[]) {
    return await upsertShopSettings(shopId, {
        visibilityMode,
        visibleProducts,
    });
}

/**
 * Checks if the form should be displayed for a given product ID based on shop settings.
 * @param {string} shopId - The ID of the shop.
 * @param {string} productId - The ID of the product.
 * @returns {Promise<boolean>} - True if the form should be shown.
 */
export async function shouldShowFormForProduct(shopId: string, productId: string): Promise<boolean> {
  const settings = await getVisibilitySettings(shopId);

  switch (settings.visibilityMode) {
    case "all":
      return true;
    case "specific":
      // Ensure comparison is safe against different ID formats (e.g., string vs. number).
      return settings.visibleProducts.some((product: any) => 
        String(product.id) === String(productId)
      );
    case "manual":
      return false; // Manual mode requires explicit triggering on the frontend.
    default:
      return true; // Default to showing the form as a failsafe.
  }
}

/**
 * Gets the visibility configuration needed for the frontend logic.
 * @param {string} shopId - The ID of the shop.
 * @returns An object containing the mode, product IDs, and manual mode flag.
 */
export async function getVisibilityConfig(shopId: string) {
  const settings = await getVisibilitySettings(shopId);

  return {
    mode: settings.visibilityMode,
    productIds: settings.visibilityMode === "specific"
      ? settings.visibleProducts.map((product: any) => String(product.id))
      : [],
    isManualMode: settings.visibilityMode === "manual",
  };
}
