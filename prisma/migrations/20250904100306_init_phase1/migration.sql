-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "publisher" TEXT,
    "locales" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "categories_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "weeks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isoWeek" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "angle" TEXT,
    "score" REAL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "flags" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "topics_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "weeks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "topics_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "topics_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "dataEnc" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobType" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "logUrl" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "site_strategies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "strategy" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "site_strategies_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "global_rulebooks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "rules" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "rulebook_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "rules" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "siteId" TEXT,
    CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scoped_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "siteId" TEXT,
    "scopes" JSONB NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "drafts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "score" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "violations" JSONB,
    "externalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "drafts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "draftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "drafts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tenweb_sites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "tenWebSiteId" TEXT NOT NULL,
    "tenWebUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSync" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tenweb_sites_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gsc_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "gscSiteUrl" TEXT NOT NULL,
    "credentialsEnc" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "gsc_connections_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gsc_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ga4_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "credentialsEnc" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ga4_connections_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpointId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "httpStatus" INTEGER,
    "response" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_deliveries_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoints" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT,
    "type" TEXT NOT NULL,
    "credentialsEnc" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "lastTestAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "integrations_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_onboarding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "wpConfigured" BOOLEAN NOT NULL DEFAULT false,
    "gscConfigured" BOOLEAN NOT NULL DEFAULT false,
    "ga4Configured" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_onboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "qa_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "draftId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "score" REAL,
    "violations" JSONB NOT NULL,
    "passedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "qa_reports_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "drafts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "site_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "draftsCount" INTEGER NOT NULL DEFAULT 0,
    "qaPassed" INTEGER NOT NULL DEFAULT 0,
    "approved" INTEGER NOT NULL DEFAULT 0,
    "published" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0.0,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_metrics_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "siteId" TEXT,
    "jobType" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0.0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_metrics_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sites_key_key" ON "sites"("key");

-- CreateIndex
CREATE INDEX "categories_siteId_idx" ON "categories"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "weeks_isoWeek_key" ON "weeks"("isoWeek");

-- CreateIndex
CREATE INDEX "topics_weekId_idx" ON "topics"("weekId");

-- CreateIndex
CREATE INDEX "topics_siteId_idx" ON "topics"("siteId");

-- CreateIndex
CREATE INDEX "topics_categoryId_idx" ON "topics"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "connections_kind_key" ON "connections"("kind");

-- CreateIndex
CREATE INDEX "credentials_type_idx" ON "credentials"("type");

-- CreateIndex
CREATE INDEX "credentials_createdAt_idx" ON "credentials"("createdAt");

-- CreateIndex
CREATE INDEX "job_runs_jobType_idx" ON "job_runs"("jobType");

-- CreateIndex
CREATE UNIQUE INDEX "site_strategies_siteId_key" ON "site_strategies"("siteId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_siteId_idx" ON "user_roles"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_siteId_key" ON "user_roles"("userId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "scoped_tokens_token_key" ON "scoped_tokens"("token");

-- CreateIndex
CREATE INDEX "scoped_tokens_token_idx" ON "scoped_tokens"("token");

-- CreateIndex
CREATE INDEX "scoped_tokens_siteId_idx" ON "scoped_tokens"("siteId");

-- CreateIndex
CREATE INDEX "drafts_siteId_idx" ON "drafts"("siteId");

-- CreateIndex
CREATE INDEX "drafts_status_idx" ON "drafts"("status");

-- CreateIndex
CREATE INDEX "drafts_externalId_idx" ON "drafts"("externalId");

-- CreateIndex
CREATE INDEX "reviews_draftId_idx" ON "reviews"("draftId");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tenweb_sites_siteId_key" ON "tenweb_sites"("siteId");

-- CreateIndex
CREATE INDEX "tenweb_sites_tenWebSiteId_idx" ON "tenweb_sites"("tenWebSiteId");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_connections_siteId_key" ON "gsc_connections"("siteId");

-- CreateIndex
CREATE INDEX "gsc_connections_gscSiteUrl_idx" ON "gsc_connections"("gscSiteUrl");

-- CreateIndex
CREATE INDEX "gsc_snapshots_siteId_idx" ON "gsc_snapshots"("siteId");

-- CreateIndex
CREATE INDEX "gsc_snapshots_dataType_idx" ON "gsc_snapshots"("dataType");

-- CreateIndex
CREATE UNIQUE INDEX "ga4_connections_siteId_key" ON "ga4_connections"("siteId");

-- CreateIndex
CREATE INDEX "ga4_connections_propertyId_idx" ON "ga4_connections"("propertyId");

-- CreateIndex
CREATE INDEX "webhook_endpoints_active_idx" ON "webhook_endpoints"("active");

-- CreateIndex
CREATE INDEX "webhook_deliveries_endpointId_idx" ON "webhook_deliveries"("endpointId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_eventType_idx" ON "webhook_deliveries"("eventType");

-- CreateIndex
CREATE INDEX "webhook_deliveries_success_idx" ON "webhook_deliveries"("success");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "integrations_siteId_idx" ON "integrations"("siteId");

-- CreateIndex
CREATE INDEX "integrations_type_idx" ON "integrations"("type");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_siteId_type_key" ON "integrations"("siteId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "user_onboarding_userId_key" ON "user_onboarding"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "qa_reports_draftId_key" ON "qa_reports"("draftId");

-- CreateIndex
CREATE INDEX "qa_reports_status_idx" ON "qa_reports"("status");

-- CreateIndex
CREATE INDEX "qa_reports_draftId_idx" ON "qa_reports"("draftId");

-- CreateIndex
CREATE UNIQUE INDEX "site_metrics_siteId_key" ON "site_metrics"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "job_metrics_jobId_key" ON "job_metrics"("jobId");

-- CreateIndex
CREATE INDEX "job_metrics_siteId_idx" ON "job_metrics"("siteId");

-- CreateIndex
CREATE INDEX "job_metrics_jobType_idx" ON "job_metrics"("jobType");

-- CreateIndex
CREATE INDEX "job_metrics_success_idx" ON "job_metrics"("success");
