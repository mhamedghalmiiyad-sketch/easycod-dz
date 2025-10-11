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
CREATE INDEX "OrderTracking_shopId_idx" ON "OrderTracking"("shopId");

-- CreateIndex
CREATE INDEX "OrderTracking_customerEmail_idx" ON "OrderTracking"("customerEmail");

-- CreateIndex
CREATE INDEX "OrderTracking_customerPhone_idx" ON "OrderTracking"("customerPhone");

-- CreateIndex
CREATE INDEX "OrderTracking_customerIp_idx" ON "OrderTracking"("customerIp");
