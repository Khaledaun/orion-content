
#!/bin/bash

echo "🛡️ Running comprehensive validation checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ "$1" = "success" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "warning" ]; then
        echo -e "${YELLOW}⚠️ $2${NC}"
    elif [ "$1" = "error" ]; then
        echo -e "${RED}❌ $2${NC}"
    else
        echo "ℹ️ $2"
    fi
}

# Initialize error counter
ERRORS=0

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_status "error" "package.json not found"
    exit 1
fi

# 1. Dependency Security Audit
print_status "info" "Running dependency security audit..."
if npm audit --audit-level=moderate > /dev/null 2>&1; then
    print_status "success" "No security vulnerabilities found"
else
    print_status "warning" "Security vulnerabilities detected. Run 'npm audit' for details."
    ((ERRORS++))
fi

# 2. Check for outdated dependencies
print_status "info" "Checking for outdated dependencies..."
OUTDATED=$(npm outdated --json 2>/dev/null)
if [ "$OUTDATED" = "{}" ] || [ -z "$OUTDATED" ]; then
    print_status "success" "All dependencies are up to date"
else
    print_status "warning" "Some dependencies are outdated. Run 'npm outdated' for details."
fi

# 3. Validate Prisma schema if it exists
if [ -f "prisma/schema.prisma" ]; then
    print_status "info" "Validating Prisma schema..."
    if npx prisma validate > /dev/null 2>&1; then
        print_status "success" "Prisma schema is valid"
    else
        print_status "error" "Prisma schema validation failed"
        ((ERRORS++))
    fi
    
    # Check if Prisma client is generated
    if [ -d "node_modules/.prisma" ] || [ -d "prisma/generated" ]; then
        print_status "success" "Prisma client is generated"
    else
        print_status "warning" "Prisma client not generated. Run 'npx prisma generate'"
    fi
fi

# 4. Check TypeScript configuration
if [ -f "tsconfig.json" ]; then
    print_status "info" "Validating TypeScript configuration..."
    if npx tsc --noEmit > /dev/null 2>&1; then
        print_status "success" "TypeScript compilation successful"
    else
        print_status "error" "TypeScript compilation failed"
        ((ERRORS++))
    fi
fi

# 5. Check for environment variables
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    print_status "warning" ".env file not found but .env.example exists"
fi

# 6. Validate Next.js configuration
if [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then
    print_status "info" "Validating Next.js configuration..."
    if node -c next.config.* > /dev/null 2>&1; then
        print_status "success" "Next.js configuration is valid"
    else
        print_status "error" "Next.js configuration has syntax errors"
        ((ERRORS++))
    fi
fi

# 7. Check for common security issues
print_status "info" "Checking for common security issues..."

# Check for hardcoded secrets
if grep -r -i "api_key\|secret\|password\|token" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" . | grep -v node_modules | grep -v ".git" | grep -E "(=|:)\s*['\"][^'\"]{10,}['\"]" > /dev/null; then
    print_status "warning" "Potential hardcoded secrets found. Please review."
fi

# Check for console.log statements
if grep -r "console\.log" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" . | grep -v node_modules | grep -v ".git" > /dev/null; then
    print_status "warning" "console.log statements found. Consider removing for production."
fi

# 8. Check build output
print_status "info" "Checking if project builds successfully..."
if npm run build > /dev/null 2>&1; then
    print_status "success" "Project builds successfully"
else
    print_status "error" "Project build failed"
    ((ERRORS++))
fi

# 9. Check for Edge Runtime compatibility
print_status "info" "Checking Edge Runtime compatibility..."

# Check for Node.js specific APIs
EDGE_INCOMPATIBLE=$(grep -r -E "(fs\.|path\.|os\.|crypto\.createHash|Buffer\.|process\.env|__dirname|__filename)" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" . | grep -v node_modules | grep -v ".git" | wc -l)

if [ "$EDGE_INCOMPATIBLE" -gt 0 ]; then
    print_status "warning" "Found $EDGE_INCOMPATIBLE potential Edge Runtime incompatible API usage(s)"
else
    print_status "success" "No obvious Edge Runtime compatibility issues found"
fi

# 10. Check test coverage
if [ -f "jest.config.js" ] || [ -f "jest.config.json" ] || grep -q "jest" package.json; then
    print_status "info" "Running test suite..."
    if npm test > /dev/null 2>&1; then
        print_status "success" "All tests passed"
    else
        print_status "error" "Some tests failed"
        ((ERRORS++))
    fi
fi

# 11. Check for proper Git hooks setup
if [ -d ".husky" ]; then
    print_status "success" "Husky Git hooks are configured"
else
    print_status "warning" "Git hooks not configured. Consider setting up Husky."
fi

# 12. Validate package.json scripts
print_status "info" "Validating package.json scripts..."
REQUIRED_SCRIPTS=("build" "dev" "start")
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if grep -q "\"$script\":" package.json; then
        print_status "success" "Script '$script' is defined"
    else
        print_status "warning" "Script '$script' is not defined"
    fi
done

# 13. Check for proper error handling in API routes
if [ -d "pages/api" ] || [ -d "app/api" ]; then
    print_status "info" "Checking API routes for error handling..."
    
    # Look for try-catch blocks in API files
    API_FILES=$(find pages/api app/api -name "*.js" -o -name "*.ts" 2>/dev/null | wc -l)
    if [ "$API_FILES" -gt 0 ]; then
        TRY_CATCH_COUNT=$(grep -r "try\s*{" pages/api app/api 2>/dev/null | wc -l)
        if [ "$TRY_CATCH_COUNT" -gt 0 ]; then
            print_status "success" "Error handling found in API routes"
        else
            print_status "warning" "Consider adding error handling to API routes"
        fi
    fi
fi

# 14. Final validation summary
echo ""
print_status "info" "Validation Summary:"
if [ $ERRORS -eq 0 ]; then
    print_status "success" "All critical validations passed! 🎉"
    echo ""
    echo "📋 Validation completed successfully. Your code is ready for commit."
    exit 0
else
    print_status "error" "$ERRORS critical error(s) found"
    echo ""
    echo "🚫 Please fix the errors above before committing."
    exit 1
fi
