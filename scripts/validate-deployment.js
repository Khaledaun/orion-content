#!/usr/bin/env node

/**
 * Deployment Validation Script
 * Validates that the deployment is ready and checks for common issues
 */

const fs = require("fs");
const path = require("path");

console.log("🚀 Validating deployment readiness...\n");

const errors = [];
const warnings = [];

// Check package.json
try {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

  // Check for npm usage (no pnpm)
  if (packageJson.packageManager) {
    warnings.push(
      "packageManager field found in package.json - should be removed for npm usage",
    );
  }

  // Check required scripts
  const requiredScripts = ["build", "build:offline", "start"];
  for (const script of requiredScripts) {
    if (!packageJson.scripts[script]) {
      errors.push(`Missing required script: ${script}`);
    }
  }

  console.log("✅ package.json validation passed");
} catch (error) {
  errors.push(`package.json validation failed: ${error.message}`);
}

// Check Vercel configuration
try {
  const vercelJson = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

  if (vercelJson.framework !== "nextjs") {
    warnings.push('vercel.json framework should be "nextjs"');
  }

  if (
    !vercelJson.buildCommand ||
    !vercelJson.buildCommand.includes("prisma generate")
  ) {
    warnings.push("vercel.json buildCommand should include Prisma generation");
  }

  console.log("✅ vercel.json validation passed");
} catch (error) {
  errors.push(`vercel.json validation failed: ${error.message}`);
}

// Check .env.example for required variables
try {
  const envExample = fs.readFileSync(".env.example", "utf8");
  const requiredVars = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];

  for (const varName of requiredVars) {
    if (!envExample.includes(varName)) {
      warnings.push(`Missing environment variable example: ${varName}`);
    }
  }

  console.log("✅ Environment variables validation passed");
} catch (error) {
  warnings.push(`Environment validation: ${error.message}`);
}

// Check Next.js configuration
try {
  const nextConfig = fs.readFileSync("next.config.js", "utf8");

  if (!nextConfig.includes("webpack")) {
    warnings.push(
      "next.config.js missing webpack configuration for path aliases",
    );
  }

  console.log("✅ Next.js configuration validation passed");
} catch (error) {
  warnings.push(`Next.js config validation: ${error.message}`);
}

// Check build output
const buildDir = ".next";
if (fs.existsSync(buildDir)) {
  console.log("✅ Build output exists");

  // Check for static exports
  const staticDir = path.join(buildDir, "static");
  if (fs.existsSync(staticDir)) {
    console.log("✅ Static assets generated");
  }
} else {
  warnings.push("No build output found - run npm run build first");
}

// Check middleware
try {
  const middleware = fs.readFileSync("middleware.ts", "utf8");

  if (middleware.includes("enhanced-middleware")) {
    errors.push(
      "middleware.ts still imports enhanced-middleware which has Edge Runtime issues",
    );
  }

  if (middleware.includes("process.")) {
    errors.push(
      "middleware.ts contains Node.js APIs incompatible with Edge Runtime",
    );
  }

  console.log("✅ Middleware validation passed");
} catch (error) {
  warnings.push(`Middleware validation: ${error.message}`);
}

// Output results
console.log("\n📋 Validation Results:");

if (errors.length > 0) {
  console.log("\n❌ ERRORS (must fix):");
  errors.forEach((error) => console.log(`  - ${error}`));
}

if (warnings.length > 0) {
  console.log("\n⚠️  WARNINGS (should review):");
  warnings.forEach((warning) => console.log(`  - ${warning}`));
}

if (errors.length === 0 && warnings.length === 0) {
  console.log("\n🎉 All validations passed! Deployment should succeed.");
} else if (errors.length === 0) {
  console.log(
    "\n✅ No errors found. Warnings should be reviewed but deployment should succeed.",
  );
} else {
  console.log("\n❌ Errors found. Fix these before deploying.");
  process.exit(1);
}
