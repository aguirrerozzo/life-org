-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurrenceDay" INTEGER,
ADD COLUMN     "templateTitle" TEXT;

-- CreateIndex
CREATE INDEX "Task_userId_isRecurring_idx" ON "Task"("userId", "isRecurring");
