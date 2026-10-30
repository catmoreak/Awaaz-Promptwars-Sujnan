-- Demo accounts have no password, and the seed recreates them. Accounts with real sign-ins do not exist yet.
DELETE FROM "User" WHERE "isDemo" = true;

-- DropIndex
DROP INDEX "User_googleSub_key";

-- AlterTable
ALTER TABLE "User"
  DROP COLUMN "avatarUrl",
  DROP COLUMN "googleSub",
  ADD COLUMN "addressLine" TEXT,
  ADD COLUMN "locality" TEXT,
  ADD COLUMN "passwordHash" TEXT NOT NULL,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "pincode" TEXT,
  ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
