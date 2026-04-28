-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "enrollmentStatus" SMALLINT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "loginIdentifier" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "status" SMALLINT NOT NULL,
    "lastLoggedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "userAccountId" INTEGER NOT NULL,
    "sessionTokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "userAccountId" INTEGER NOT NULL,
    "roleType" SMALLINT NOT NULL,
    "scopeType" SMALLINT NOT NULL,
    "scopeId" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employee_tenantId_idx" ON "Employee"("tenantId");

-- CreateIndex
CREATE INDEX "Employee_enrollmentStatus_idx" ON "Employee"("enrollmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_employeeId_key" ON "UserAccount"("employeeId");

-- CreateIndex
CREATE INDEX "UserAccount_tenantId_idx" ON "UserAccount"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_tenantId_employeeId_key" ON "UserAccount"("tenantId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_tenantId_loginIdentifier_key" ON "UserAccount"("tenantId", "loginIdentifier");

-- CreateIndex
CREATE INDEX "Session_tenantId_idx" ON "Session"("tenantId");

-- CreateIndex
CREATE INDEX "Session_userAccountId_idx" ON "Session"("userAccountId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionTokenHash_key" ON "Session"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "RoleAssignment_tenantId_idx" ON "RoleAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "RoleAssignment_userAccountId_idx" ON "RoleAssignment"("userAccountId");

-- CreateIndex
CREATE INDEX "RoleAssignment_roleType_idx" ON "RoleAssignment"("roleType");

-- CreateIndex
CREATE INDEX "RoleAssignment_scopeType_scopeId_idx" ON "RoleAssignment"("scopeType", "scopeId");

-- AddForeignKey
ALTER TABLE "UserAccount" ADD CONSTRAINT "UserAccount_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
-- enrollmentStatus: 10=在職, 20=休職, 30=退職
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_enrollmentStatus_check"
    CHECK ("enrollmentStatus" IN (10, 20, 30));

-- AddCheckConstraint
-- status: 1=有効, 2=無効
ALTER TABLE "UserAccount" ADD CONSTRAINT "UserAccount_status_check"
    CHECK ("status" IN (1, 2));

-- AddCheckConstraint
-- roleType: 1=HR_ADMIN, 2=MANAGER, 3=ORG_ADMIN, 4=EXECUTIVE_VIEWER, 5=EMPLOYEE
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_roleType_check"
    CHECK ("roleType" IN (1, 2, 3, 4, 5));

-- AddCheckConstraint
-- scopeType: 1=SELF, 2=ORGANIZATION, 3=ORGANIZATION_TREE, 4=TENANT_ALL
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_scopeType_check"
    CHECK ("scopeType" IN (1, 2, 3, 4));
