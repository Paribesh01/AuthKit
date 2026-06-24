-- AlterTable
ALTER TABLE "oauth_providers" ALTER COLUMN "clientId" DROP NOT NULL,
ALTER COLUMN "clientSecret" DROP NOT NULL;
