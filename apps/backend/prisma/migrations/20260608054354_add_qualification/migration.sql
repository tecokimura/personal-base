-- CreateTable
CREATE TABLE "Qualification" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "acquiredDate" DATE NOT NULL,
    "note" VARCHAR(500),
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Qualification_tenantId_idx" ON "Qualification"("tenantId");

-- CreateIndex
CREATE INDEX "Qualification_employeeId_idx" ON "Qualification"("employeeId");

-- CreateIndex
CREATE INDEX "Qualification_tenantId_employeeId_idx" ON "Qualification"("tenantId", "employeeId");

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
