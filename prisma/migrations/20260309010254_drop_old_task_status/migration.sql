/*
  Warnings:

  - You are about to drop the column `status` on the `Task` table. All the data in the column will be lost.
  - Made the column `statusId` on table `Task` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Task_userId_status_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "status",
ALTER COLUMN "statusId" SET NOT NULL;

-- DropEnum
DROP TYPE "TaskStatus";

-- CreateIndex
CREATE INDEX "Task_userId_statusId_idx" ON "Task"("userId", "statusId");
