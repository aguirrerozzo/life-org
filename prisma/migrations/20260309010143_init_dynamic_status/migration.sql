-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "statusId" TEXT;

-- CreateTable
CREATE TABLE "Status" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'oklch(0.75 0.15 85)',
    "order" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Status_userId_idx" ON "Status"("userId");

-- AddForeignKey
ALTER TABLE "Status" ADD CONSTRAINT "Status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status"("id") ON DELETE CASCADE ON UPDATE CASCADE;
