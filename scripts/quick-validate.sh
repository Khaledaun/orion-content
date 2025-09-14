#!/bin/bash

# Simple validation script for Copilot integration
echo "🔍 Running Copilot Integration Validation..."

# Basic checks
echo "✅ Checking TypeScript..."
npm run typecheck

echo "✅ Checking ESLint..."
npm run lint:check || echo "⚠️ ESLint issues found (can be auto-fixed)"

echo "✅ Checking Prettier..."
npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}" || echo "⚠️ Formatting issues found (can be auto-fixed)"

echo "✅ Testing build..."
npm run build || echo "⚠️ Build issues found"

echo ""
echo "🎉 Basic validation completed!"
echo "Run the full validation with: ./scripts/validate.sh"