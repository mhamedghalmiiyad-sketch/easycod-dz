-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "accountOwner" BOOLEAN,
    "collaborator" BOOLEAN,
    "email" TEXT,
    "emailVerified" BOOLEAN,
    "firstName" TEXT,
    "lastName" TEXT,
    "locale" TEXT
);

-- CreateTable
CREATE TABLE "AppProxy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "configuration" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShopSettings" (
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
    CONSTRAINT "ShopSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderTracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "draftOrderId" TEXT NOT NULL,
    "customerIp" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerPostalCode" TEXT,
    "totalQuantity" INTEGER NOT NULL,
    "orderTotal" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AppProxy_shopId_key" ON "AppProxy"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shopId_key" ON "ShopSettings"("shopId");

-- CreateIndex
CREATE INDEX "OrderTracking_shopId_idx" ON "OrderTracking"("shopId");

-- CreateIndex
CREATE INDEX "OrderTracking_customerEmail_idx" ON "OrderTracking"("customerEmail");

-- CreateIndex
CREATE INDEX "OrderTracking_customerPhone_idx" ON "OrderTracking"("customerPhone");

-- CreateIndex
CREATE INDEX "OrderTracking_customerIp_idx" ON "OrderTracking"("customerIp");
