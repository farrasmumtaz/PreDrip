/*
  Warnings:

  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `home_address` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `home_latitude` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `home_longitude` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - Added the required column `passwordHash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "FloodHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "latitude" DECIMAL NOT NULL,
    "longitude" DECIMAL NOT NULL,
    "severity" TEXT NOT NULL,
    "waterLevel" REAL NOT NULL,
    "occurredAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WeatherSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "latitude" DECIMAL NOT NULL,
    "longitude" DECIMAL NOT NULL,
    "rainfall" REAL,
    "humidity" REAL,
    "temperature" REAL,
    "weatherCode" TEXT,
    "recordedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FloodRisk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "latitude" DECIMAL NOT NULL,
    "longitude" DECIMAL NOT NULL,
    "score" REAL NOT NULL,
    "level" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CitizenReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "latitude" DECIMAL NOT NULL,
    "longitude" DECIMAL NOT NULL,
    "waterLevel" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CitizenReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "homeAddress" TEXT,
    "homeLatitude" REAL,
    "homeLongitude" REAL,
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("email", "id", "name", "role") SELECT "email", "id", "name", "role" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
