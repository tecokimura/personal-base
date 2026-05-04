-- CreateTable
CREATE TABLE "WorkHistory" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "yearMonthFrom" VARCHAR(7) NOT NULL,
    "yearMonthTo" VARCHAR(7),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "workSummary" TEXT NOT NULL,
    "toolsUsed" VARCHAR(1000),
    "roleName" VARCHAR(255),
    "teamSize" INTEGER,
    "projectCode" VARCHAR(100),
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkHistory_tenantId_idx" ON "WorkHistory"("tenantId");

-- CreateIndex
CREATE INDEX "WorkHistory_employeeId_idx" ON "WorkHistory"("employeeId");

-- CreateIndex
CREATE INDEX "WorkHistory_tenantId_employeeId_idx" ON "WorkHistory"("tenantId", "employeeId");

-- AddForeignKey
ALTER TABLE "WorkHistory" ADD CONSTRAINT "WorkHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
