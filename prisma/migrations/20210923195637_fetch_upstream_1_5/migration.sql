/*
  Warnings:

  - A unique constraint covering the columns `[userId,slug]` on the table `EventType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PaymentType" AS ENUM ('STRIPE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN  IF NOT EXISTS   "paid" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "BookingReference" ADD COLUMN  IF NOT EXISTS    "meetingId" TEXT,
ADD COLUMN     "meetingPassword" TEXT,
ADD COLUMN     "meetingUrl" TEXT;

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN  IF NOT EXISTS    "currency" TEXT NOT NULL DEFAULT E'usd',
ADD COLUMN   IF NOT EXISTS   "disableGuests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN   IF NOT EXISTS   "price" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN   IF NOT EXISTS   "locale" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "refunded" BOOLEAN NOT NULL,
    "data" JSONB NOT NULL,
    "externalId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payment.uid_unique" ON "Payment"("uid");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payment.externalId_unique" ON "Payment"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EventType.userId_slug_unique" ON "EventType"("userId", "slug");

-- AddForeignKey
ALTER TABLE "Payment" ADD FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
