-- CreateTable
CREATE TABLE "AppProxy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "configuration" TEXT DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AppProxy_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Session" ("shop") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AbandonedCart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerName" TEXT,
    "cartData" TEXT NOT NULL,
    "formData" TEXT,
    "abandonedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReminderAt" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "isRecovered" BOOLEAN NOT NULL DEFAULT false,
    "recoveredAt" DATETIME,
    "recoveryOrderId" TEXT,
    CONSTRAINT "AbandonedCart_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Session" ("shop") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderTracking" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderTracking_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Session" ("shop") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OrderTracking" ("createdAt", "currency", "customerEmail", "customerIp", "customerPhone", "customerPostalCode", "draftOrderId", "id", "orderTotal", "shopId", "totalQuantity") SELECT "createdAt", "currency", "customerEmail", "customerIp", "customerPhone", "customerPostalCode", "draftOrderId", "id", "orderTotal", "shopId", "totalQuantity" FROM "OrderTracking";
DROP TABLE "OrderTracking";
ALTER TABLE "new_OrderTracking" RENAME TO "OrderTracking";
CREATE INDEX "OrderTracking_shopId_idx" ON "OrderTracking"("shopId");
CREATE INDEX "OrderTracking_customerEmail_idx" ON "OrderTracking"("customerEmail");
CREATE INDEX "OrderTracking_customerPhone_idx" ON "OrderTracking"("customerPhone");
CREATE INDEX "OrderTracking_customerIp_idx" ON "OrderTracking"("customerIp");
CREATE INDEX "OrderTracking_createdAt_idx" ON "OrderTracking"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AppProxy_shopId_key" ON "AppProxy"("shopId");

-- CreateIndex
CREATE INDEX "AppProxy_shopId_idx" ON "AppProxy"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "AbandonedCart_sessionId_key" ON "AbandonedCart"("sessionId");

-- CreateIndex
CREATE INDEX "AbandonedCart_shopId_idx" ON "AbandonedCart"("shopId");

-- CreateIndex
CREATE INDEX "AbandonedCart_customerEmail_idx" ON "AbandonedCart"("customerEmail");

-- CreateIndex
CREATE INDEX "AbandonedCart_abandonedAt_idx" ON "AbandonedCart"("abandonedAt");

-- CreateIndex
CREATE INDEX "AbandonedCart_isRecovered_idx" ON "AbandonedCart"("isRecovered");
