-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "twoFactorVerified" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "TenantSetting" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "twoFactorPolicy" SMALLINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorAuth" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "userAccountId" INTEGER NOT NULL,
    "totpSecret" VARCHAR(255) NOT NULL,
    "backupCodeHashes" TEXT[],
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorAuth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSetting_tenantId_key" ON "TenantSetting"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorAuth_userAccountId_key" ON "TwoFactorAuth"("userAccountId");

-- CreateIndex
CREATE INDEX "TwoFactorAuth_tenantId_idx" ON "TwoFactorAuth"("tenantId");

-- AddForeignKey
ALTER TABLE "TwoFactorAuth" ADD CONSTRAINT "TwoFactorAuth_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
