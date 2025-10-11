/*
  Warnings:

  - You are about to drop the `AppProxy` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[shop]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AppProxy_shopId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AppProxy";
PRAGMA foreign_keys=on;

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
    "generalSettings" TEXT,
    "userBlocking" TEXT,
    CONSTRAINT "ShopSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Session" ("shop") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ShopSettings" ("allowedCountries", "createdAt", "disableOnCollections", "disableOnHome", "disableSpecificProducts", "enableSpecificCountries", "enableSpecificProducts", "formFields", "formStyle", "generalSettings", "googleAccessToken", "googleRefreshToken", "googleSheetId", "googleSheetImportLines", "googleSheetImportOrders", "googleSheetName", "googleSheetTabName", "googleUserEmail", "hiddenProducts", "hideAddToCart", "hideBuyNow", "id", "maximumAmount", "minimumAmount", "pixelSettings", "shippingRates", "shopId", "updatedAt", "userBlocking", "visibilityMode", "visibleProducts") SELECT "allowedCountries", "createdAt", "disableOnCollections", "disableOnHome", "disableSpecificProducts", "enableSpecificCountries", "enableSpecificProducts", "formFields", "formStyle", "generalSettings", "googleAccessToken", "googleRefreshToken", "googleSheetId", "googleSheetImportLines", "googleSheetImportOrders", "googleSheetName", "googleSheetTabName", "googleUserEmail", "hiddenProducts", "hideAddToCart", "hideBuyNow", "id", "maximumAmount", "minimumAmount", "pixelSettings", "shippingRates", "shopId", "updatedAt", "userBlocking", "visibilityMode", "visibleProducts" FROM "ShopSettings";
DROP TABLE "ShopSettings";
ALTER TABLE "new_ShopSettings" RENAME TO "ShopSettings";
CREATE UNIQUE INDEX "ShopSettings_shopId_key" ON "ShopSettings"("shopId");
CREATE INDEX "ShopSettings_shopId_idx" ON "ShopSettings"("shopId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OrderTracking_createdAt_idx" ON "OrderTracking"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_shop_key" ON "Session"("shop");

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");
