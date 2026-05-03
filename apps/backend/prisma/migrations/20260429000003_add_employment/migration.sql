-- CreateTable
-- employmentType: 1=正社員, 2=契約社員, 3=パートタイム, 4=派遣, 5=業務委託
-- status: 1=在職, 2=休職, 3=退職, 9=削除
CREATE TABLE "Employment" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "positionMasterId" INTEGER,
    "employmentType" SMALLINT NOT NULL,
    "isPrimaryAssignment" BOOLEAN NOT NULL DEFAULT false,
    "managerEmployeeId" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" SMALLINT NOT NULL,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employment_tenantId_idx" ON "Employment"("tenantId");
CREATE INDEX "Employment_employeeId_idx" ON "Employment"("employeeId");
CREATE INDEX "Employment_organizationId_idx" ON "Employment"("organizationId");
CREATE INDEX "Employment_tenantId_isPrimaryAssignment_idx" ON "Employment"("tenantId", "isPrimaryAssignment");
CREATE INDEX "Employment_status_idx" ON "Employment"("status");

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Employment" ADD CONSTRAINT "Employment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_employmentType_check"
    CHECK ("employmentType" IN (1, 2, 3, 4, 5));

ALTER TABLE "Employment" ADD CONSTRAINT "Employment_status_check"
    CHECK ("status" IN (1, 2, 3, 9));
