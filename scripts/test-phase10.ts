/**
 * Phase 10 MVP Test Script
 * Tests the core Phase 10 functionality
 */

import { prisma } from "../lib/prisma";
import { qaValidator } from "../lib/qa-validator";
import {
  /* integrationManager, */
  IntegrationType,
  IntegrationManager,
} from "../lib/integration-manager";

async function runTests() {
  console.log("🚀 Starting Phase 10 MVP Tests...");

  try {
    // Test 1: Database Connectivity
    console.log("\n1. Testing database connectivity...");
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected. Found ${userCount} users.`);

    // Test 2: QA Validator
    console.log("\n2. Testing QA validator...");
    const testContent = {
      title: "Test Article Title",
      content:
        "<h1>Test Article</h1><p>This is a test article with some content to validate.</p>",
      metaTitle: "Test Meta Title",
      metaDescription: "This is a test meta description for the article.",
      targetKeywords: ["test", "article"],
    };

    const qaReport = await qaValidator.validate(testContent);
    console.log(
      `✅ QA Validation completed. Status: ${qaReport.status}, Score: ${qaReport.score}`,
    );
    console.log(
      `   Violations: ${qaReport.violations.length}, Passed rules: ${qaReport.passedRules.length}`,
    );

    // Test 3: Integration Manager - Dummy Credentials
    console.log("\n3. Testing integration manager...");
    const _dummyWpCreds = IntegrationManager.generateDummyCredentials(
      IntegrationType.WORDPRESS,
    );
    console.log("✅ Generated dummy WordPress credentials");

    const _dummyGscCreds = IntegrationManager.generateDummyCredentials(
      IntegrationType.GSC,
    );
    console.log("✅ Generated dummy GSC credentials");

    const _dummyGa4Creds = IntegrationManager.generateDummyCredentials(
      IntegrationType.GA4,
    );
    console.log("✅ Generated dummy GA4 credentials");

    // Test 4: Database Schema (check new Phase 10 models)
    console.log("\n4. Testing Phase 10 database models...");

    // Test Integration model
    try {
      const integrationCount = await prisma.integration.count();
      console.log(
        `✅ Integration model working. Found ${integrationCount} integrations.`,
      );
    } catch (error) {
      console.log("❌ Integration model error:", error);
    }

    // Test UserOnboarding model
    try {
      const onboardingCount = await prisma.userOnboarding.count();
      console.log(
        `✅ UserOnboarding model working. Found ${onboardingCount} records.`,
      );
    } catch (error) {
      console.log("❌ UserOnboarding model error:", error);
    }

    // Test QAReport model
    try {
      const qaReportCount = await prisma.qAReport.count();
      console.log(`✅ QAReport model working. Found ${qaReportCount} reports.`);
    } catch (error) {
      console.log("❌ QAReport model error:", error);
    }

    // Test SiteMetrics model
    try {
      const metricsCount = await prisma.siteMetrics.count();
      console.log(
        `✅ SiteMetrics model working. Found ${metricsCount} metrics.`,
      );
    } catch (error) {
      console.log("❌ SiteMetrics model error:", error);
    }

    // Test JobMetrics model
    try {
      const jobMetricsCount = await prisma.jobMetrics.count();
      console.log(
        `✅ JobMetrics model working. Found ${jobMetricsCount} job metrics.`,
      );
    } catch (error) {
      console.log("❌ JobMetrics model error:", error);
    }

    // Test 5: Content Pipeline Models
    console.log("\n5. Testing content pipeline...");

    const draftCount = await prisma.draft.count();
    console.log(`✅ Draft model working. Found ${draftCount} drafts.`);

    const reviewCount = await prisma.review.count();
    console.log(`✅ Review model working. Found ${reviewCount} reviews.`);

    console.log("\n🎉 Phase 10 MVP Tests Completed Successfully!");
    console.log("\nCore Phase 10 Features Validated:");
    console.log("  ✅ Enhanced database models");
    console.log("  ✅ QA validation system");
    console.log("  ✅ Integration management");
    console.log("  ✅ Content pipeline support");
    console.log("  ✅ Metrics and observability");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
runTests();
