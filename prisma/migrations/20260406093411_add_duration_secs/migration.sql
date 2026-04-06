/*
  Warnings:

  - You are about to drop the column `durationMs` on the `scrobble` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `scrobble` DROP COLUMN `durationMs`,
    ADD COLUMN `durationSec` INTEGER NOT NULL DEFAULT 210000;
