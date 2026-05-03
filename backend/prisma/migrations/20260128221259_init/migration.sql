/*
  Warnings:

  - You are about to drop the column `ownerId` on the `clients` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_ownerId_fkey";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "ownerId";
