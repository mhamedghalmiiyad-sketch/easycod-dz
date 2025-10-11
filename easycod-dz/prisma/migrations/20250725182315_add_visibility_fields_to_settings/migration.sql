-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShopSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "formFields" TEXT DEFAULT '[]',
    "formStyle" TEXT DEFAULT '{}',
    "shippingRates" TEXT DEFAULT '[]',
    "pixelSettings" TEXT DEFAULT '{}',
    "visibilityMode" TEXT DEFAULT 'both_cart_product',
    "visibleProducts" TEXT DEFAULT '[]',
    "hiddenProducts" TEXT DEFAULT '[]',
    "allowedCountries" TEXT DEFAULT '[]',
    "hideAddToCart" BOOLEAN NOT NULL DEFAULT false,
    "hideBuyNow" BOOLEAN NOT NULL DEFAULT false,
    "disableOnHome" BOOLEAN NOT NULL DEFAULT false,
    "disableOnCollections" BOOLEAN NOT NULL DEFAULT false,
    "enableSpecificProducts" BOOLEAN NOT NULL DEFAULT false,
    "disableSpecificProducts" BOOLEAN NOT NULL DEFAULT false,
    "enableSpecificCountries" BOOLEAN NOT NULL DEFAULT false,
    "minimumAmount" TEXT DEFAULT '',
    "maximumAmount" TEXT DEFAULT '',
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleUserEmail" TEXT,
    "googleSheetId" TEXT,
    "googleSheetName" TEXT,
    "googleSheetTabName" TEXT,
    "googleSheetImportOrders" BOOLEAN NOT NULL DEFAULT true,
    "googleSheetImportLines" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ShopSettings" ("createdAt", "formFields", "formStyle", "googleAccessToken", "googleRefreshToken", "googleSheetId", "googleSheetImportLines", "googleSheetImportOrders", "googleSheetName", "googleSheetTabName", "googleUserEmail", "id", "pixelSettings", "shippingRates", "shopId", "updatedAt", "visibilityMode", "visibleProducts") SELECT "createdAt", "formFields", "formStyle", "googleAccessToken", "googleRefreshToken", "googleSheetId", "googleSheetImportLines", "googleSheetImportOrders", "googleSheetName", "googleSheetTabName", "googleUserEmail", "id", "pixelSettings", "shippingRates", "shopId", "updatedAt", "visibilityMode", "visibleProducts" FROM "ShopSettings";
DROP TABLE "ShopSettings";
ALTER TABLE "new_ShopSettings" RENAME TO "ShopSettings";
CREATE UNIQUE INDEX "ShopSettings_shopId_key" ON "ShopSettings"("shopId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
