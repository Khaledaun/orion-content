#!/usr/bin/env npx tsx

/**
 * PR #39 Deployment Readiness Validator
 * Specific validation script to ensure PR #39 can deploy successfully
 */

console.log("🚀 PR #39 Deployment Readiness Check\n");

import { execSync } from "child_process";
import { existsSync } from "fs";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

const results: CheckResult[] = [];

function addResult(name: string, status: "pass" | "fail" | "warn", message: string) {
  results.push({ name, status, message });
}

// Check 1: TypeScript compilation
try {
  console.log("🔍 Checking TypeScript compilation...");
  execSync("npm run typecheck", { stdio: "pipe" });
  addResult("TypeScript", "pass", "All types compile successfully");
} catch (error) {
  addResult("TypeScript", "fail", "TypeScript compilation failed");
}

// Check 2: Environment validation (build mode)
try {
  console.log("🔍 Checking build-time environment...");
  execSync("BUILD_TIME=true npm run check:env", { stdio: "pipe" });
  addResult("Environment", "pass", "Build-time environment validation passed");
} catch (error) {
  addResult("Environment", "fail", "Environment validation failed");
}

// Check 3: Next.js build
try {
  console.log("🔍 Testing Next.js build...");
  execSync("BUILD_TIME=true NEXT_TELEMETRY_DISABLED=1 npx next build", { 
    stdio: "pipe",
    timeout: 300000 // 5 minutes
  });
  addResult("Build", "pass", "Next.js build completed successfully");
} catch (error) {
  addResult("Build", "fail", "Next.js build failed");
}

// Check 4: Package.json validation
try {
  console.log("🔍 Checking package.json configuration...");
  const packageJson = require("../package.json");
  
  if (packageJson.engines?.node === ">=20.x") {
    addResult("Package Config", "pass", "Node.js version constraint updated");
  } else {
    addResult("Package Config", "warn", "Node.js version constraint may need updating");
  }
  
  if (packageJson.scripts?.build) {
    addResult("Scripts", "pass", "Build script configured");
  } else {
    addResult("Scripts", "fail", "Missing build script");
  }
} catch (error) {
  addResult("Package Config", "fail", "Package.json validation failed");
}

// Check 5: Vercel configuration
try {
  console.log("🔍 Checking Vercel configuration...");
  const vercelJson = require("../vercel.json");
  
  if (vercelJson.buildCommand?.includes("BUILD_TIME=true")) {
    addResult("Vercel Config", "pass", "Build command updated for deployment");
  } else {
    addResult("Vercel Config", "warn", "Build command may need updating");
  }
  
  if (vercelJson.framework === "nextjs") {
    addResult("Vercel Framework", "pass", "Framework correctly set to nextjs");
  } else {
    addResult("Vercel Framework", "warn", "Framework should be set to nextjs");
  }
} catch (error) {
  addResult("Vercel Config", "fail", "Vercel configuration validation failed");
}

// Check 6: Critical files exist
console.log("🔍 Checking critical files...");
const criticalFiles = [
  { path: "next.config.js", name: "Next.js Config" },
  { path: "package.json", name: "Package.json" },
  { path: "vercel.json", name: "Vercel Config" },
  { path: "prisma/schema.prisma", name: "Prisma Schema" },
  { path: ".env.example", name: "Environment Example" },
  { path: ".env.development", name: "Development Environment" },
];

for (const file of criticalFiles) {
  if (existsSync(file.path)) {
    addResult("File Check", "pass", `${file.name} exists`);
  } else {
    addResult("File Check", "fail", `${file.name} missing`);
  }
}

// Print results
console.log("\n📋 Deployment Readiness Results:\n");

const passed = results.filter(r => r.status === "pass");
const warnings = results.filter(r => r.status === "warn");
const failed = results.filter(r => r.status === "fail");

if (passed.length > 0) {
  console.log("✅ PASSED:");
  passed.forEach(r => console.log(`  ✓ ${r.name}: ${r.message}`));
  console.log();
}

if (warnings.length > 0) {
  console.log("⚠️  WARNINGS:");
  warnings.forEach(r => console.log(`  ! ${r.name}: ${r.message}`));
  console.log();
}

if (failed.length > 0) {
  console.log("❌ FAILED:");
  failed.forEach(r => console.log(`  ✗ ${r.name}: ${r.message}`));
  console.log();
}

// Final assessment
const totalChecks = results.length;
const passedChecks = passed.length;
const successRate = Math.round((passedChecks / totalChecks) * 100);

console.log(`📊 Overall Status: ${passedChecks}/${totalChecks} checks passed (${successRate}%)\n`);

if (failed.length === 0) {
  if (warnings.length === 0) {
    console.log("🎉 PR #39 is ready for deployment! All checks passed.");
  } else {
    console.log("✅ PR #39 should deploy successfully. Review warnings for optimization.");
  }
  process.exit(0);
} else {
  console.log("💥 PR #39 has deployment blockers. Fix failed checks before merging.");
  process.exit(1);
}