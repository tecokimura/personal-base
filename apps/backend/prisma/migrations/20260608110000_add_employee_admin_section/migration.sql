-- CreateTable
CREATE TABLE "EmployeeAdminSection" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "evaluation" VARCHAR(500),
    "grade" VARCHAR(255),
    "joiningReason" TEXT,
    "employmentCategory" VARCHAR(255),
    "salaryBand" VARCHAR(255),
    "specialNotes" TEXT,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAdminSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAdminSection_employeeId_key" ON "EmployeeAdminSection"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeAdminSection_tenantId_idx" ON "EmployeeAdminSection"("tenantId");

-- CreateIndex
CREATE INDEX "EmployeeAdminSection_tenantId_employeeId_idx" ON "EmployeeAdminSection"("tenantId", "employeeId");

-- AddForeignKey
ALTER TABLE "EmployeeAdminSection" ADD CONSTRAINT "EmployeeAdminSection_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
