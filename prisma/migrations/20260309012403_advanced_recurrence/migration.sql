-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "recurrenceDaysOfWeek" INTEGER[],
ADD COLUMN     "recurrenceMonth" INTEGER,
ADD COLUMN     "recurrenceType" "RecurrenceType";
