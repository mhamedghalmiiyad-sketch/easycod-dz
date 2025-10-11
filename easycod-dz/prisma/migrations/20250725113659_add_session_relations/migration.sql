/*
  Warnings:

  - You are about to drop the `FormSettings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "Session_id_key";

-- AlterTable
ALTER TABLE "Session" ADD COLUMN "accountOwner" BOOLEAN;
ALTER TABLE "Session" ADD COLUMN "collaborator" BOOLEAN;
ALTER TABLE "Session" ADD COLUMN "email" TEXT;
ALTER TABLE "Session" ADD COLUMN "emailVerified" BOOLEAN;
ALTER TABLE "Session" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Session" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Session" ADD COLUMN "locale" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "FormSettings";
PRAGMA foreign_keys=on;

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
    "formFields" TEXT,
    "formStyle" TEXT,
    "shippingRates" TEXT,
    "pixelSettings" TEXT,
    "visibilityMode" TEXT NOT NULL DEFAULT 'all',
    "visibleProducts" TEXT,
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

-- CreateIndex
CREATE UNIQUE INDEX "AppProxy_shopId_key" ON "AppProxy"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shopId_key" ON "ShopSettings"("shopId");
