-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "accountOwner" BOOLEAN,
    "collaborator" BOOLEAN,
    "email" TEXT,
    "emailVerified" BOOLEAN,
    "firstName" TEXT,
    "lastName" TEXT,
    "locale" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppProxy" (
    "id" SERIAL NOT NULL,
    "shopId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "configuration" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppProxy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" SERIAL NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "generalSettings" TEXT,
    "userBlocking" TEXT,
    "redirectUrl" TEXT,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTracking" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "draftOrderId" TEXT NOT NULL,
    "customerIp" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerPostalCode" TEXT,
    "totalQuantity" INTEGER NOT NULL,
    "orderTotal" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbandonedCart" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerName" TEXT,
    "cartData" TEXT NOT NULL,
    "formData" TEXT,
    "abandonedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReminderAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "isRecovered" BOOLEAN NOT NULL DEFAULT false,
    "recoveredAt" TIMESTAMP(3),
    "recoveryOrderId" TEXT,

    CONSTRAINT "AbandonedCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "algeria_cities" (
    "id" SERIAL NOT NULL,
    "commune_name" TEXT NOT NULL,
    "commune_name_ascii" TEXT NOT NULL,
    "daira_name" TEXT NOT NULL,
    "daira_name_ascii" TEXT NOT NULL,
    "wilaya_code" TEXT NOT NULL,
    "wilaya_name" TEXT NOT NULL,
    "wilaya_name_ascii" TEXT NOT NULL,

    CONSTRAINT "algeria_cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_shop_key" ON "Session"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "AppProxy_shopId_key" ON "AppProxy"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shopId_key" ON "ShopSettings"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "AbandonedCart_sessionId_key" ON "AbandonedCart"("sessionId");

-- CreateIndex
CREATE INDEX "ShopSettings_shopId_idx" ON "ShopSettings"("shopId");

-- CreateIndex
CREATE INDEX "OrderTracking_shopId_idx" ON "OrderTracking"("shopId");

-- CreateIndex
CREATE INDEX "OrderTracking_customerEmail_idx" ON "OrderTracking"("customerEmail");

-- CreateIndex
CREATE INDEX "OrderTracking_customerPhone_idx" ON "OrderTracking"("customerPhone");

-- CreateIndex
CREATE INDEX "OrderTracking_customerIp_idx" ON "OrderTracking"("customerIp");

-- CreateIndex
CREATE INDEX "OrderTracking_createdAt_idx" ON "OrderTracking"("createdAt");

-- CreateIndex
CREATE INDEX "AbandonedCart_shopId_idx" ON "AbandonedCart"("shopId");

-- CreateIndex
CREATE INDEX "AbandonedCart_customerEmail_idx" ON "AbandonedCart"("customerEmail");

-- CreateIndex
CREATE INDEX "AbandonedCart_abandonedAt_idx" ON "AbandonedCart"("abandonedAt");

-- CreateIndex
CREATE INDEX "AbandonedCart_isRecovered_idx" ON "AbandonedCart"("isRecovered");

-- AddForeignKey
ALTER TABLE "AppProxy" ADD CONSTRAINT "AppProxy_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Session"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSettings" ADD CONSTRAINT "ShopSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Session"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTracking" ADD CONSTRAINT "OrderTracking_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Session"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbandonedCart" ADD CONSTRAINT "AbandonedCart_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Session"("shop") ON DELETE CASCADE ON UPDATE CASCADE;
