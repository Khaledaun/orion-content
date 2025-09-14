#!/bin/bash

# Comprehensive validation script for Orion Content Management System
# This script performs security, performance, and compatibility validations

set -e

echo "🚀 Starting comprehensive validation for Orion Content Management System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validation counters
PASSED=0
FAILED=0
WARNINGS=0

# Track validation results
add_pass() {
    ((PASSED++))
    print_success "$1"
}

add_fail() {
    ((FAILED++))
    print_error "$1"
}

add_warning() {
    ((WARNINGS++))
    print_warning "$1"
}

print_status "Checking prerequisites..."

# Check Node.js version
if command_exists node; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    if [[ "$NODE_VERSION" =~ ^20\. ]]; then
        add_pass "Node.js version $NODE_VERSION is compatible"
    else
        add_warning "Node.js version $NODE_VERSION may not be optimal (recommended: 20.x)"
    fi
else
    add_fail "Node.js is not installed"
    exit 1
fi

# Check npm
if command_exists npm; then
    add_pass "npm is available"
else
    add_fail "npm is not installed"
    exit 1
fi

print_status "Installing dependencies if needed..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    npm install --silent
    add_pass "Dependencies installed"
else
    add_pass "Dependencies already installed"
fi

print_status "Running TypeScript compilation..."
if npm run typecheck > /dev/null 2>&1; then
    add_pass "TypeScript compilation successful"
else
    add_warning "TypeScript compilation has issues (run 'npm run typecheck' for details)"
fi

print_status "Running ESLint..."
if npm run lint:check > /dev/null 2>&1; then
    add_pass "ESLint validation passed"
else
    add_warning "ESLint found issues (run 'npm run lint' to fix)"
fi

print_status "Checking Prettier formatting..."
if command_exists npx; then
    if npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}" 2>/dev/null; then
        add_pass "Code formatting is consistent"
    else
        add_warning "Code formatting issues found (run 'npm run format' to fix)"
    fi
else
    add_warning "Prettier check skipped (npx not available)"
fi

print_status "Validating environment configuration..."
if [ -f ".env.example" ]; then
    add_pass "Environment example file exists"
    
    # Check for required environment variables in .env.example
    required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env.example; then
            add_pass "Required environment variable $var is documented"
        else
            add_warning "Required environment variable $var is not documented in .env.example"
        fi
    done
else
    add_warning ".env.example file not found"
fi

print_status "Checking Prisma configuration..."
if [ -f "prisma/schema.prisma" ]; then
    add_pass "Prisma schema found"
    
    if command_exists npx; then
        if npx prisma validate 2>/dev/null; then
            add_pass "Prisma schema is valid"
        else
            add_fail "Prisma schema validation failed"
        fi
        
        if npx prisma generate 2>/dev/null; then
            add_pass "Prisma client generation successful"
        else
            add_fail "Prisma client generation failed"
        fi
    else
        add_warning "Prisma validation skipped (npx not available)"
    fi
else
    add_fail "Prisma schema not found"
fi

print_status "Validating package.json..."
if [ -f "package.json" ]; then
    add_pass "package.json exists"
    
    # Check for required scripts
    required_scripts=("build" "dev" "lint" "typecheck")
    for script in "${required_scripts[@]}"; do
        if jq -e ".scripts.\"$script\"" package.json >/dev/null 2>&1; then
            add_pass "Required script '$script' is defined"
        else
            add_warning "Recommended script '$script' is not defined"
        fi
    done
    
    # Check for security vulnerabilities
    if command_exists npm; then
        print_status "Running security audit..."
        if npm audit --audit-level=high > /dev/null 2>&1; then
            add_pass "No high-severity security vulnerabilities found"
        else
            add_warning "Security vulnerabilities detected (run 'npm audit fix' to resolve)"
        fi
    fi
else
    add_fail "package.json not found"
fi

print_status "Checking Next.js configuration..."
if [ -f "next.config.js" ]; then
    add_pass "Next.js configuration found"
    
    # Check for production optimizations
    if grep -q "experimental" next.config.js; then
        add_warning "Experimental features detected in Next.js config"
    fi
    
    if grep -q "runtime.*edge" next.config.js; then
        add_pass "Edge Runtime configuration detected"
    else
        add_warning "Consider configuring Edge Runtime for better performance"
    fi
else
    add_fail "next.config.js not found"
fi

print_status "Validating TailwindCSS configuration..."
if [ -f "tailwind.config.ts" ] || [ -f "tailwind.config.js" ]; then
    add_pass "TailwindCSS configuration found"
else
    add_warning "TailwindCSS configuration not found"
fi

print_status "Checking for security best practices..."

# Check for sensitive files that shouldn't be committed
sensitive_patterns=(".env" "*.key" "*.pem" "config/secrets*")
for pattern in "${sensitive_patterns[@]}"; do
    if find . -name "$pattern" -not -path "./node_modules/*" | grep -q .; then
        add_warning "Potentially sensitive files found matching pattern: $pattern"
    fi
done

# Check .gitignore
if [ -f ".gitignore" ]; then
    add_pass ".gitignore exists"
    
    important_ignores=(".env" "node_modules" ".next" "*.log")
    for ignore in "${important_ignores[@]}"; do
        if grep -q "$ignore" .gitignore; then
            add_pass "Important pattern '$ignore' is in .gitignore"
        else
            add_warning "Consider adding '$ignore' to .gitignore"
        fi
    done
else
    add_fail ".gitignore not found"
fi

print_status "Testing build process..."
if npm run build > /dev/null 2>&1; then
    add_pass "Production build successful"
    
    # Check build output size
    if [ -d ".next" ]; then
        build_size=$(du -sh .next 2>/dev/null | cut -f1 || echo "unknown")
        add_pass "Build output size: $build_size"
        
        # Check for static optimization
        if [ -d ".next/static" ]; then
            add_pass "Static optimization enabled"
        else
            add_warning "Static optimization may not be enabled"
        fi
    fi
else
    add_warning "Production build had issues (check environment setup)"
fi

print_status "Checking for performance optimizations..."

# Check for image optimization
if grep -r "next/image" app/ components/ 2>/dev/null | grep -q "Image"; then
    add_pass "Next.js Image optimization is being used"
else
    add_warning "Consider using Next.js Image component for better performance"
fi

# Check for dynamic imports
if grep -r "import(" app/ components/ 2>/dev/null | grep -q "import("; then
    add_pass "Dynamic imports detected for code splitting"
else
    add_warning "Consider using dynamic imports for better performance"
fi

print_status "Validating accessibility..."

# Check for accessibility attributes
if grep -r "aria-" app/ components/ 2>/dev/null | grep -q "aria-"; then
    add_pass "ARIA attributes found in components"
else
    add_warning "Consider adding ARIA attributes for better accessibility"
fi

print_status "Edge Runtime compatibility check..."

# Check for Node.js-specific APIs that are not Edge Runtime compatible
nodejs_apis=("fs\." "path\." "process\.env\." "os\." "crypto\.createHash")
edge_incompatible=false

for api in "${nodejs_apis[@]}"; do
    if grep -r "$api" app/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v ".d.ts" | grep -q .; then
        add_warning "Potential Edge Runtime incompatible API found: $api"
        edge_incompatible=true
    fi
done

if [ "$edge_incompatible" = false ]; then
    add_pass "No obvious Edge Runtime compatibility issues found"
fi

print_status "Database validation..."

# Check for SQL injection prevention
if grep -r "prisma\." app/ lib/ 2>/dev/null | grep -q "prisma\."; then
    add_pass "Prisma ORM usage detected (helps prevent SQL injection)"
else
    add_warning "Ensure proper SQL injection prevention measures"
fi

# Check for proper error handling in database operations
if grep -r "try.*catch" app/ lib/ 2>/dev/null | grep -q "prisma"; then
    add_pass "Error handling detected in database operations"
else
    add_warning "Ensure proper error handling for database operations"
fi

print_status "Final validation summary..."

echo
echo "=================================="
echo "     VALIDATION SUMMARY"
echo "=================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo "=================================="

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        print_success "🎉 All validations passed! Your code is ready for production."
        exit 0
    else
        print_warning "⚠️ All critical validations passed, but there are warnings to address."
        exit 0
    fi
else
    print_error "❌ Some validations failed. Please address the issues before proceeding."
    exit 1
fi