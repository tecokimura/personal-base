-- AlterTable
ALTER TABLE "Employment" DROP COLUMN "isPrimaryAssignment";

-- DropIndex
DROP INDEX IF EXISTS "Employment_tenantId_isPrimaryAssignment_idx";
