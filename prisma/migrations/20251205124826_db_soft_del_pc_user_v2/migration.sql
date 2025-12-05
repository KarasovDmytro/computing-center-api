-- AlterEnum
ALTER TYPE "ComputerStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "computers" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3);
