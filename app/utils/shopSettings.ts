// utils/shopSettings.ts
import { db } from "../db.server";
// FIX: Use camelCase for Prisma types to match the model names in schema.prisma.
import {
  Prisma,
} from "@prisma/client";

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
  customThankYouMessage:
    "Thank you for your order! We will contact you shortly to confirm.",
  enableTaxes: false,
  taxRate: "0",
  taxCountries: [],
  taxName: "VAT",
  taxIsIncluded: false,
  hasConfiguredVisibility: false,
};

// Default values for the entire ShopSettings model for initialization.
const DEFAULT_SHOP_SETTINGS = {
  formFields: "[]",
  formStyle: "{}",
  pixelSettings: "{}",
  visibilityMode: "both_cart_product",
  visibleProducts: "[]",
  hiddenProducts: "[]",
  allowedCountries: "[]",
  hideAddToCart: false,
  hideBuyNow: false,
  disableOnHome: false,
  disableOnCollections: false,
  enableSpecificProducts: false,
  disableSpecificProducts: false,
  enableSpecificCountries: false,
  minimumAmount: "",
  maximumAmount: "",
  generalSettings: JSON.stringify(DEFAULT_GENERAL_SETTINGS),
  userBlocking: "{}",
};

/**
 * Initializes settings for a new shop if they don't already exist.
 * This includes default shop settings, general settings, and app proxy settings.
 * @param {string} shopId - The shop domain to initialize (e.g., "shop.myshopify.com").
 */
export async function initializeShopSettings(shopId: string) {
  try {
    // First, check if a Session exists for this shop
    const existingSession = await db.session.findUnique({
      where: { shop: shopId },
    });

    if (!existingSession) {
      console.log(`⚠️ No session found for shop ${shopId}. Shop settings initialization skipped.`);
      console.log(`🔍 This means the app hasn't been installed/authorized for this shop yet.`);
      console.log(`🔍 The shop needs to go through the OAuth flow first.`);
      return;
    }

    const existing = await db.shopSettings.findUnique({
      where: { shopId },
    });

    if (!existing) {
      await db.shopSettings.create({
        data: {
          ...DEFAULT_SHOP_SETTINGS,
          shopId: shopId,
        },
      });
    } else {
      // FIX: Use the camelCased 'shopSettingsUpdateInput' type.
      const dataToUpdate: any = {};
      if (
        existing.generalSettings === null ||
        existing.generalSettings === undefined
      ) {
        dataToUpdate.generalSettings = JSON.stringify(DEFAULT_GENERAL_SETTINGS);
      }
      if (existing.userBlocking === null || existing.userBlocking === undefined) {
        dataToUpdate.userBlocking = "{}";
      }
      if (Object.keys(dataToUpdate).length > 0) {
        await db.shopSettings.update({
          where: { shopId },
          data: dataToUpdate,
        });
      }
    }

    const existingProxy = await db.appProxy.findUnique({
      where: { shopId },
    });

    if (!existingProxy) {
      await db.appProxy.create({
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
  return await db.shopSettings.findUnique({
    where: { shopId },
  });
}

/**
 * Retrieves the raw app proxy settings from the database.
 * @param {string} shopId - The ID of the shop.
 * @returns The appProxy object or null if not found.
 */
export async function getAppProxySettings(shopId: string) {
  return await db.appProxy.findUnique({
    where: { shopId },
  });
}

// --- JSON HELPER FUNCTIONS ---

export function parseJsonField<T>(
  jsonString: string | null | undefined,
  fallback: T,
): T {
  if (jsonString === null || jsonString === undefined) {
    return fallback;
  }
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

export function stringifyJsonField(data: any, fallback: string = "{}"): string {
  try {
    return JSON.stringify(data);
  } catch {
    return fallback;
  }
}

// --- UPDATE/UPSERT FUNCTIONS ---

type ShopSettingsUpdates = {
  formFields?: any;
  formStyle?: any;
  pixelSettings?: any;
  visibilityMode?: string;
  visibleProducts?: any[];
  hiddenProducts?: any[];
  allowedCountries?: any[];
  hideAddToCart?: boolean;
  hideBuyNow?: boolean;
  disableOnHome?: boolean;
  disableOnCollections?: boolean;
  enableSpecificProducts?: boolean;
  disableSpecificProducts?: boolean;
  enableSpecificCountries?: boolean;
  minimumAmount?: string;
  maximumAmount?: string;
  generalSettings?: any;
  userBlocking?: any;
};

/**
 * Updates existing shop settings with proper JSON handling.
 * @param {string} shopId - The ID of the shop to update.
 * @param {ShopSettingsUpdates} updates - The fields to update.
 */
export async function updateShopSettings(
  shopId: string,
  updates: ShopSettingsUpdates,
) {
  // FIX: Use the camelCased 'shopSettingsUpdateInput' type.
  const data: any = {};

  if (updates.formFields !== undefined)
    data.formFields = stringifyJsonField(updates.formFields, "[]");
  if (updates.formStyle !== undefined)
    data.formStyle = stringifyJsonField(updates.formStyle, "{}");
  if (updates.pixelSettings !== undefined)
    data.pixelSettings = stringifyJsonField(updates.pixelSettings, "{}");
  if (updates.visibleProducts !== undefined)
    data.visibleProducts = stringifyJsonField(updates.visibleProducts, "[]");
  if (updates.hiddenProducts !== undefined)
    data.hiddenProducts = stringifyJsonField(updates.hiddenProducts, "[]");
  if (updates.allowedCountries !== undefined)
    data.allowedCountries = stringifyJsonField(updates.allowedCountries, "[]");
  if (updates.generalSettings !== undefined)
    data.generalSettings = stringifyJsonField(updates.generalSettings, "{}");
  if (updates.userBlocking !== undefined)
    data.userBlocking = stringifyJsonField(updates.userBlocking, "{}");
  if (updates.visibilityMode !== undefined)
    data.visibilityMode = updates.visibilityMode;
  if (updates.minimumAmount !== undefined)
    data.minimumAmount = updates.minimumAmount;
  if (updates.maximumAmount !== undefined)
    data.maximumAmount = updates.maximumAmount;
  if (updates.hideAddToCart !== undefined)
    data.hideAddToCart = updates.hideAddToCart;
  if (updates.hideBuyNow !== undefined) data.hideBuyNow = updates.hideBuyNow;
  if (updates.disableOnHome !== undefined)
    data.disableOnHome = updates.disableOnHome;
  if (updates.disableOnCollections !== undefined)
    data.disableOnCollections = updates.disableOnCollections;
  if (updates.enableSpecificProducts !== undefined)
    data.enableSpecificProducts = updates.enableSpecificProducts;
  if (updates.disableSpecificProducts !== undefined)
    data.disableSpecificProducts = updates.disableSpecificProducts;
  if (updates.enableSpecificCountries !== undefined)
    data.enableSpecificCountries = updates.enableSpecificCountries;

  return await db.shopSettings.update({
    where: { shopId },
    data,
  });
}

/**
 * Creates or updates shop settings with ALL fields from Prisma schema.
 */
export async function upsertShopSettings(
  shopId: string,
  updates: ShopSettingsUpdates,
) {
  // FIX: Use the camelCased 'shopSettingsUpdateInput' type.
  const updateData: any = {};

  if (updates.formFields !== undefined)
    updateData.formFields = stringifyJsonField(updates.formFields, "[]");
  if (updates.formStyle !== undefined)
    updateData.formStyle = stringifyJsonField(updates.formStyle, "{}");
  if (updates.pixelSettings !== undefined)
    updateData.pixelSettings = stringifyJsonField(updates.pixelSettings, "{}");
  if (updates.visibleProducts !== undefined)
    updateData.visibleProducts = stringifyJsonField(
      updates.visibleProducts,
      "[]",
    );
  if (updates.hiddenProducts !== undefined)
    updateData.hiddenProducts = stringifyJsonField(
      updates.hiddenProducts,
      "[]",
    );
  if (updates.allowedCountries !== undefined)
    updateData.allowedCountries = stringifyJsonField(
      updates.allowedCountries,
      "[]",
    );
  if (updates.generalSettings !== undefined)
    updateData.generalSettings = stringifyJsonField(
      updates.generalSettings,
      "{}",
    );
  if (updates.userBlocking !== undefined)
    updateData.userBlocking = stringifyJsonField(updates.userBlocking, "{}");
  if (updates.visibilityMode !== undefined)
    updateData.visibilityMode = updates.visibilityMode;
  if (updates.minimumAmount !== undefined)
    updateData.minimumAmount = updates.minimumAmount;
  if (updates.maximumAmount !== undefined)
    updateData.maximumAmount = updates.maximumAmount;
  if (updates.hideAddToCart !== undefined)
    updateData.hideAddToCart = updates.hideAddToCart;
  if (updates.hideBuyNow !== undefined)
    updateData.hideBuyNow = updates.hideBuyNow;
  if (updates.disableOnHome !== undefined)
    updateData.disableOnHome = updates.disableOnHome;
  if (updates.disableOnCollections !== undefined)
    updateData.disableOnCollections = updates.disableOnCollections;
  if (updates.enableSpecificProducts !== undefined)
    updateData.enableSpecificProducts = updates.enableSpecificProducts;
  if (updates.disableSpecificProducts !== undefined)
    updateData.disableSpecificProducts = updates.disableSpecificProducts;
  if (updates.enableSpecificCountries !== undefined)
    updateData.enableSpecificCountries = updates.enableSpecificCountries;

  // FIX: Use the camelCased 'shopSettingsCreateInput' type.
  const createData: any = {
    shopId: shopId,
    formFields:
      updates.formFields !== undefined
        ? stringifyJsonField(updates.formFields, "[]")
        : DEFAULT_SHOP_SETTINGS.formFields,
    formStyle:
      updates.formStyle !== undefined
        ? stringifyJsonField(updates.formStyle, "{}")
        : DEFAULT_SHOP_SETTINGS.formStyle,
    pixelSettings:
      updates.pixelSettings !== undefined
        ? stringifyJsonField(updates.pixelSettings, "{}")
        : DEFAULT_SHOP_SETTINGS.pixelSettings,
    visibilityMode:
      updates.visibilityMode ?? DEFAULT_SHOP_SETTINGS.visibilityMode,
    visibleProducts:
      updates.visibleProducts !== undefined
        ? stringifyJsonField(updates.visibleProducts, "[]")
        : DEFAULT_SHOP_SETTINGS.visibleProducts,
    hiddenProducts:
      updates.hiddenProducts !== undefined
        ? stringifyJsonField(updates.hiddenProducts, "[]")
        : DEFAULT_SHOP_SETTINGS.hiddenProducts,
    allowedCountries:
      updates.allowedCountries !== undefined
        ? stringifyJsonField(updates.allowedCountries, "[]")
        : DEFAULT_SHOP_SETTINGS.allowedCountries,
    hideAddToCart: updates.hideAddToCart ?? DEFAULT_SHOP_SETTINGS.hideAddToCart,
    hideBuyNow: updates.hideBuyNow ?? DEFAULT_SHOP_SETTINGS.hideBuyNow,
    disableOnHome: updates.disableOnHome ?? DEFAULT_SHOP_SETTINGS.disableOnHome,
    disableOnCollections:
      updates.disableOnCollections ??
      DEFAULT_SHOP_SETTINGS.disableOnCollections,
    enableSpecificProducts:
      updates.enableSpecificProducts ??
      DEFAULT_SHOP_SETTINGS.enableSpecificProducts,
    disableSpecificProducts:
      updates.disableSpecificProducts ??
      DEFAULT_SHOP_SETTINGS.disableSpecificProducts,
    enableSpecificCountries:
      updates.enableSpecificCountries ??
      DEFAULT_SHOP_SETTINGS.enableSpecificCountries,
    minimumAmount:
      updates.minimumAmount ?? DEFAULT_SHOP_SETTINGS.minimumAmount,
    maximumAmount:
      updates.maximumAmount ?? DEFAULT_SHOP_SETTINGS.maximumAmount,
    generalSettings:
      updates.generalSettings !== undefined
        ? stringifyJsonField(updates.generalSettings, "{}")
        : DEFAULT_SHOP_SETTINGS.generalSettings,
    userBlocking:
      updates.userBlocking !== undefined
        ? stringifyJsonField(updates.userBlocking, "{}")
        : DEFAULT_SHOP_SETTINGS.userBlocking,
  };

  return await db.shopSettings.upsert({
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
export async function updateAppProxySettings(
  shopId: string,
  updates: AppProxyUpdates,
) {
  // FIX: Use the camelCased 'appProxyUpdateInput' type.
  const data: any = {};
  if (updates.isEnabled !== undefined) data.isEnabled = updates.isEnabled;
  if (updates.configuration !== undefined)
    data.configuration = stringifyJsonField(updates.configuration);

  return await db.appProxy.update({
    where: { shopId },
    data,
  });
}

/**
 * Creates or updates app proxy settings.
 * @param {string} shopId - The ID of the shop.
 * @param {AppProxyUpdates} updates - The fields to upsert.
 */
export async function upsertAppProxySettings(
  shopId: string,
  updates: AppProxyUpdates,
) {
  // FIX: Use the camelCased 'appProxyUpdateInput' type.
  const updateData: any = {};
  if (updates.isEnabled !== undefined) updateData.isEnabled = updates.isEnabled;
  if (updates.configuration !== undefined)
    updateData.configuration = stringifyJsonField(updates.configuration);

  const createData = {
    shopId,
    isEnabled: updates.isEnabled ?? true,
    configuration:
      updates.configuration !== undefined
        ? stringifyJsonField(updates.configuration)
        : "{}",
  };

  return await db.appProxy.upsert({
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
    hiddenProducts: parseJsonField(settings.hiddenProducts, []),
    allowedCountries: parseJsonField(settings.allowedCountries, []),
    generalSettings: parseJsonField(
      settings.generalSettings,
      DEFAULT_GENERAL_SETTINGS,
    ),
    userBlocking: parseJsonField(settings.userBlocking, {}),
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
  const settings = await db.shopSettings.findUnique({
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
export async function updateGeneralSettings(
  shopId: string,
  generalSettings: object,
) {
  return await upsertShopSettings(shopId, { generalSettings });
}

/**
 * Gets all visibility-related settings for the form.
 * @param {string} shopId - The ID of the shop.
 * @returns An object with all visibility settings.
 */
export async function getVisibilitySettings(shopId: string) {
  try {
    const settings = await db.shopSettings.findUnique({
      where: { shopId },
      select: {
        visibilityMode: true,
        visibleProducts: true,
        hiddenProducts: true,
        enableSpecificProducts: true,
        disableSpecificProducts: true,
      },
    });

    if (!settings) {
      return {
        visibilityMode: "both_cart_product",
        visibleProducts: [],
        hiddenProducts: [],
        enableSpecificProducts: false,
        disableSpecificProducts: false,
      };
    }

    return {
      visibilityMode: settings.visibilityMode || "both_cart_product",
      visibleProducts: parseJsonField(settings.visibleProducts, []),
      hiddenProducts: parseJsonField(settings.hiddenProducts, []),
      enableSpecificProducts: settings.enableSpecificProducts ?? false,
      disableSpecificProducts: settings.disableSpecificProducts ?? false,
    };
  } catch (error) {
    console.error("Error getting visibility settings:", error);
    return {
      visibilityMode: "both_cart_product",
      visibleProducts: [],
      hiddenProducts: [],
      enableSpecificProducts: false,
      disableSpecificProducts: false,
    };
  }
}

/**
 * Checks if the form should be displayed for a given product ID based on comprehensive shop settings.
 * @param {string} shopId - The ID of the shop.
 * @param {string} productId - The ID of the product.
 * @returns {Promise<boolean>} - True if the form should be shown.
 */
export async function shouldShowFormForProduct(
  shopId: string,
  productId: string,
): Promise<boolean> {
  const settings = await getVisibilitySettings(shopId);

  const isProductInList = (list: any[], id: string) =>
    list.some((p: any) => String(p.id) === String(id));

  if (settings.enableSpecificProducts) {
    return isProductInList(settings.visibleProducts, productId);
  }

  if (settings.disableSpecificProducts) {
    return !isProductInList(settings.hiddenProducts, productId);
  }

  return true;
}

/**
 * Gets the full visibility configuration needed for frontend logic.
 * @param {string} shopId - The ID of the shop.
 * @returns An object containing all visibility settings for the frontend.
 */
export async function getVisibilityConfig(shopId: string) {
  const settings = await getParsedShopSettings(shopId);

  if (!settings) {
    return {
      mode: "both_cart_product",
      visibleProductIds: [],
      hiddenProductIds: [],
      allowedCountryCodes: [],
      hideAddToCart: false,
      hideBuyNow: false,
      disableOnHome: false,
      disableOnCollections: false,
      enableSpecificProducts: false,
      disableSpecificProducts: false,
      enableSpecificCountries: false,
      minimumAmount: null,
      maximumAmount: null,
    };
  }

  const getProductIds = (products: any[]) =>
    products.map((p: any) => String(p.id));
  const getCountryCodes = (countries: any[]) =>
    countries.map((c: any) => String(c.code));

  return {
    mode: settings.visibilityMode,
    visibleProductIds: getProductIds(settings.visibleProducts),
    hiddenProductIds: getProductIds(settings.hiddenProducts),
    allowedCountryCodes: getCountryCodes(settings.allowedCountries),
    hideAddToCart: settings.hideAddToCart,
    hideBuyNow: settings.hideBuyNow,
    disableOnHome: settings.disableOnHome,
    disableOnCollections: settings.disableOnCollections,
    enableSpecificProducts: settings.enableSpecificProducts,
    disableSpecificProducts: settings.disableSpecificProducts,
    enableSpecificCountries: settings.enableSpecificCountries,
    minimumAmount: settings.minimumAmount || null,
    maximumAmount: settings.maximumAmount || null,
  };
}