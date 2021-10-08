-- AlterTable
ALTER TABLE "users" ADD COLUMN     "teamId" TEXT,
ALTER COLUMN "asyncUseCalendar" SET DEFAULT true;
