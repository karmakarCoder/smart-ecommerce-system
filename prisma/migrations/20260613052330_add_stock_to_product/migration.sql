-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'available',
ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0;
