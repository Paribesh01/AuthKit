-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
    "requireUppercase" BOOLEAN NOT NULL DEFAULT false,
    "requireNumber" BOOLEAN NOT NULL DEFAULT false,
    "requireEmailVerification" BOOLEAN NOT NULL DEFAULT false,
    "allowSignups" BOOLEAN NOT NULL DEFAULT true,
    "sessionDurationHours" INTEGER NOT NULL DEFAULT 168,
    "maxSessionsPerUser" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user_mfa" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_user_mfa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_email_otps" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_email_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_applicationId_key" ON "app_settings"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_mfa_appUserId_key" ON "app_user_mfa"("appUserId");

-- CreateIndex
CREATE INDEX "app_email_otps_appUserId_purpose_idx" ON "app_email_otps"("appUserId", "purpose");

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_user_mfa" ADD CONSTRAINT "app_user_mfa_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_email_otps" ADD CONSTRAINT "app_email_otps_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
