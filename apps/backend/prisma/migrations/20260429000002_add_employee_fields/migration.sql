-- Remove legacy enrollmentStatus (status is now owned by Employment.status)
ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_enrollmentStatus_check";
DROP INDEX IF EXISTS "Employee_enrollmentStatus_idx";
ALTER TABLE "Employee" DROP COLUMN "enrollmentStatus";

-- Add profile columns to Employee
ALTER TABLE "Employee"
  ADD COLUMN "employeeNumber" VARCHAR(50),
  ADD COLUMN "fullName" VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN "displayName" VARCHAR(255),
  ADD COLUMN "email" VARCHAR(255),
  ADD COLUMN "birthDate" DATE,
  ADD COLUMN "photoStorageKey" VARCHAR(1000),
  ADD COLUMN "profileFreeText" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "updatedBy" INTEGER;

ALTER TABLE "Employee" ALTER COLUMN "fullName" DROP DEFAULT;

-- Unique: tenantId + employeeNumber (partial: non-null only)
CREATE UNIQUE INDEX "Employee_tenantId_employeeNumber_key"
  ON "Employee"("tenantId", "employeeNumber")
  WHERE "employeeNumber" IS NOT NULL;

-- Index: tenantId + isDeleted for filtering deleted employees
CREATE INDEX "Employee_tenantId_isDeleted_idx" ON "Employee"("tenantId", "isDeleted");
