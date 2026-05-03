/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,employeeNumber]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_parentOrganizationId_fkey";

-- CreateTable
CREATE TABLE "PositionMaster" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PositionMaster_tenantId_idx" ON "PositionMaster"("tenantId");

-- CreateIndex
CREATE INDEX "PositionMaster_tenantId_isActive_idx" ON "PositionMaster"("tenantId", "isActive");

-- Replace the earlier partial unique index with the schema-level unique index
DROP INDEX "Employee_tenantId_employeeNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "Employee_tenantId_employeeNumber_key" ON "Employee"("tenantId", "employeeNumber");

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_positionMasterId_fkey" FOREIGN KEY ("positionMasterId") REFERENCES "PositionMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_parentOrganizationId_fkey" FOREIGN KEY ("parentOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
