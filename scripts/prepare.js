#!/usr/bin/env node

// Check if we're in a production environment and skip husky installation
const isProduction = process.env.NODE_ENV === "production";
const isCI = process.env.CI === "true";
const isVercel = process.env.VERCEL === "1";

if (isProduction || isCI || isVercel) {
  console.log("Skipping husky installation in production/CI environment");
  process.exit(0);
}

// Only install husky in development environments
const { execSync } = require("child_process");

try {
  console.log("Installing husky for development environment...");
  execSync("husky install", { stdio: "inherit" });
} catch (error) {
  console.warn("Failed to install husky, but continuing...");
  process.exit(0);
}
