-- CreateTable
CREATE TABLE "LoginHistory" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "userAccountId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "loggedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),

    CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditHistory" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "actionType" VARCHAR(50) NOT NULL,
    "changedByEmployeeId" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scopeSummary" VARCHAR(500),

    CONSTRAINT "EditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginHistory_tenantId_idx" ON "LoginHistory"("tenantId");

-- CreateIndex
CREATE INDEX "LoginHistory_userAccountId_idx" ON "LoginHistory"("userAccountId");

-- CreateIndex
CREATE INDEX "LoginHistory_tenantId_loggedInAt_idx" ON "LoginHistory"("tenantId", "loggedInAt");

-- CreateIndex
CREATE INDEX "EditHistory_tenantId_idx" ON "EditHistory"("tenantId");

-- CreateIndex
CREATE INDEX "EditHistory_tenantId_entityType_idx" ON "EditHistory"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "EditHistory_tenantId_changedAt_idx" ON "EditHistory"("tenantId", "changedAt");
