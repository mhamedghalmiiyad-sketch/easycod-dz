-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FormSettings" (
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
    "buttonSize" TEXT NOT NULL DEFAULT 'medium',
    "animationSpeed" TEXT NOT NULL DEFAULT '300',
    "theme" TEXT NOT NULL DEFAULT 'light',
    CONSTRAINT "FormSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FormSettings" ("buttonColor", "buttonText", "firstNameLabel", "firstNamePlaceholder", "formTitle", "id", "isFirstNameDisabled", "isLastNameDisabled", "isPhoneDisabled", "isPhoneRequired", "lastNameLabel", "lastNamePlaceholder", "phoneLabel", "phonePlaceholder", "shopId", "textColor") SELECT "buttonColor", "buttonText", "firstNameLabel", "firstNamePlaceholder", "formTitle", "id", "isFirstNameDisabled", "isLastNameDisabled", "isPhoneDisabled", "isPhoneRequired", "lastNameLabel", "lastNamePlaceholder", "phoneLabel", "phonePlaceholder", "shopId", "textColor" FROM "FormSettings";
DROP TABLE "FormSettings";
ALTER TABLE "new_FormSettings" RENAME TO "FormSettings";
CREATE UNIQUE INDEX "FormSettings_shopId_key" ON "FormSettings"("shopId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
