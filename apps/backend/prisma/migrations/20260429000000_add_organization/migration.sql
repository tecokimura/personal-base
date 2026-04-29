-- CreateTable
-- leaderType: 1=部門長, 2=副部門長
-- status: 1=有効, 2=終了済み
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "organizationName" VARCHAR(255) NOT NULL,
    "organizationCode" VARCHAR(100),
    "parentOrganizationId" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- leaderType: 1=部門長, 2=副部門長
-- status: 1=有効, 2=終了済み
CREATE TABLE "OrganizationLeader" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "leaderType" SMALLINT NOT NULL,
    "isPrimaryLeader" BOOLEAN NOT NULL DEFAULT false,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" SMALLINT NOT NULL,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationLeader_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_tenantId_organizationCode_key" ON "Organization"("tenantId", "organizationCode");

-- CreateIndex
CREATE INDEX "Organization_tenantId_idx" ON "Organization"("tenantId");

-- CreateIndex
CREATE INDEX "Organization_tenantId_isActive_idx" ON "Organization"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Organization_parentOrganizationId_idx" ON "Organization"("parentOrganizationId");

-- CreateIndex
CREATE INDEX "OrganizationLeader_tenantId_idx" ON "OrganizationLeader"("tenantId");

-- CreateIndex
CREATE INDEX "OrganizationLeader_organizationId_idx" ON "OrganizationLeader"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationLeader_tenantId_employeeId_idx" ON "OrganizationLeader"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "OrganizationLeader_status_idx" ON "OrganizationLeader"("status");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_parentOrganizationId_fkey" FOREIGN KEY ("parentOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationLeader" ADD CONSTRAINT "OrganizationLeader_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
-- leaderType: 1=部門長, 2=副部門長
ALTER TABLE "OrganizationLeader" ADD CONSTRAINT "OrganizationLeader_leaderType_check"
    CHECK ("leaderType" IN (1, 2));

-- AddCheckConstraint
-- status: 1=有効, 2=終了済み
ALTER TABLE "OrganizationLeader" ADD CONSTRAINT "OrganizationLeader_status_check"
    CHECK ("status" IN (1, 2));
