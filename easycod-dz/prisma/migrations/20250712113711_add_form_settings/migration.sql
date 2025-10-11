/*
  Warnings:

  - You are about to drop the column `accountOwner` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `collaborator` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `locale` on the `Session` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "FormSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "formTitle" TEXT NOT NULL DEFAULT 'Complete your order',
    "isFirstNameDisabled" BOOLEAN NOT NULL DEFAULT false,
    "firstNameLabel" TEXT NOT NULL DEFAULT 'First Name',
    "firstNamePlaceholder" TEXT NOT NULL DEFAULT 'Enter your first name',
    "isLastNameDisabled" BOOLEAN NOT NULL DEFAULT false,
    "lastNameLabel" TEXT NOT NULL DEFAULT 'Last Name',
    "lastNamePlaceholder" TEXT NOT NULL DEFAULT 'Enter your last name',
    "isPhoneDisabled" BOOLEAN NOT NULL DEFAULT false,
    "phoneLabel" TEXT NOT NULL DEFAULT 'Phone Number',
    "phonePlaceholder" TEXT NOT NULL DEFAULT 'e.g., 05 XX XX XX XX',
    "isPhoneRequired" BOOLEAN NOT NULL DEFAULT true,
    "buttonText" TEXT NOT NULL DEFAULT 'Place Order',
    "buttonColor" TEXT NOT NULL DEFAULT '#008060',
    "textColor" TEXT NOT NULL DEFAULT '#1E293B',
    CONSTRAINT "FormSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT
);
INSERT INTO "new_Session" ("accessToken", "expires", "id", "isOnline", "scope", "shop", "state", "userId") SELECT "accessToken", "expires", "id", "isOnline", "scope", "shop", "state", "userId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE UNIQUE INDEX "Session_id_key" ON "Session"("id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "FormSettings_shopId_key" ON "FormSettings"("shopId");
