-- CreateTable
CREATE TABLE "algeria_cities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "commune_name" TEXT NOT NULL,
    "commune_name_ascii" TEXT NOT NULL,
    "daira_name" TEXT NOT NULL,
    "daira_name_ascii" TEXT NOT NULL,
    "wilaya_code" TEXT NOT NULL,
    "wilaya_name" TEXT NOT NULL,
    "wilaya_name_ascii" TEXT NOT NULL
);
