-- CreateEnum
CREATE TYPE "public"."QAStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."integrations" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "type" TEXT NOT NULL,
    "credentialsEnc" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "lastTestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_onboarding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wpConfigured" BOOLEAN NOT NULL DEFAULT false,
    "gscConfigured" BOOLEAN NOT NULL DEFAULT false,
    "ga4Configured" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."qa_reports" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "status" "public"."QAStatus" NOT NULL DEFAULT 'PENDING',
    "score" DOUBLE PRECISION,
    "violations" JSONB NOT NULL,
    "passedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qa_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_metrics" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "draftsCount" INTEGER NOT NULL DEFAULT 0,
    "qaPassed" INTEGER NOT NULL DEFAULT 0,
    "approved" INTEGER NOT NULL DEFAULT 0,
    "published" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_metrics" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "siteId" TEXT,
    "jobType" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integrations_siteId_idx" ON "public"."integrations"("siteId");

-- CreateIndex
CREATE INDEX "integrations_type_idx" ON "public"."integrations"("type");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_siteId_type_key" ON "public"."integrations"("siteId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "user_onboarding_userId_key" ON "public"."user_onboarding"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "qa_reports_draftId_key" ON "public"."qa_reports"("draftId");

-- CreateIndex
CREATE INDEX "qa_reports_status_idx" ON "public"."qa_reports"("status");

-- CreateIndex
CREATE INDEX "qa_reports_draftId_idx" ON "public"."qa_reports"("draftId");

-- CreateIndex
CREATE UNIQUE INDEX "site_metrics_siteId_key" ON "public"."site_metrics"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "job_metrics_jobId_key" ON "public"."job_metrics"("jobId");

-- CreateIndex
CREATE INDEX "job_metrics_siteId_idx" ON "public"."job_metrics"("siteId");

-- CreateIndex
CREATE INDEX "job_metrics_jobType_idx" ON "public"."job_metrics"("jobType");

-- CreateIndex
CREATE INDEX "job_metrics_success_idx" ON "public"."job_metrics"("success");

-- AddForeignKey
ALTER TABLE "public"."integrations" ADD CONSTRAINT "integrations_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_onboarding" ADD CONSTRAINT "user_onboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."qa_reports" ADD CONSTRAINT "qa_reports_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "public"."drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."site_metrics" ADD CONSTRAINT "site_metrics_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_metrics" ADD CONSTRAINT "job_metrics_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

