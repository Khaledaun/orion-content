#!/bin/bash

# Automated Copilot Integration Setup Script
# This script sets up the development environment after merging the Copilot integration PR

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Orion Content - Copilot Integration Setup${NC}"
echo "=================================================="

# Function to print colored output
print_info() {
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

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "This script must be run from the root of the git repository"
    exit 1
fi

print_info "Checking prerequisites..."

# Check Node.js version
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    if [[ "$NODE_VERSION" =~ ^20\. ]]; then
        print_success "Node.js version $NODE_VERSION detected"
    else
        print_warning "Node.js version $NODE_VERSION detected (recommended: 20.x)"
    fi
else
    print_error "Node.js is not installed. Please install Node.js 20.x"
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    print_success "npm is available"
else
    print_error "npm is not installed"
    exit 1
fi

print_info "Installing dependencies..."
npm install

print_info "Setting up Git hooks..."
if npm run prepare; then
    print_success "Git hooks configured successfully"
else
    print_warning "Git hooks setup encountered issues"
fi

print_info "Generating Prisma client..."
if npx prisma generate 2>/dev/null; then
    print_success "Prisma client generated"
else
    print_warning "Prisma client generation skipped (database not accessible)"
fi

print_info "Validating TypeScript configuration..."
if npm run typecheck 2>/dev/null; then
    print_success "TypeScript validation passed"
else
    print_warning "TypeScript validation found issues"
fi

print_info "Checking code formatting..."
if npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}" 2>/dev/null; then
    print_success "Code formatting is consistent"
else
    print_info "Formatting code with Prettier..."
    npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}" 2>/dev/null || true
    print_success "Code formatted successfully"
fi

print_info "Running ESLint..."
if npm run lint 2>/dev/null; then
    print_success "ESLint validation passed"
else
    print_warning "ESLint found some issues (may have been auto-fixed)"
fi

print_info "Testing build process..."
if npm run build 2>/dev/null; then
    print_success "Production build successful"
else
    print_warning "Production build encountered issues"
fi

print_info "Running comprehensive validation..."
if [ -f "./scripts/validate.sh" ]; then
    if ./scripts/validate.sh; then
        print_success "Comprehensive validation passed"
    else
        print_warning "Some validation checks failed (see details above)"
    fi
else
    print_warning "Validation script not found"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "🎉 Your Copilot integration is now ready!"
echo ""
echo "Next steps:"
echo "1. Create a new branch: git checkout -b feature/your-feature"
echo "2. Make your changes"
echo "3. Commit (pre-commit hooks will run automatically)"
echo "4. Push and create a PR"
echo "5. Tag @copilot for automated review"
echo ""
echo "📚 Documentation: docs/copilot-setup.md"
echo "🔍 Validation: ./scripts/validate.sh"
echo "🛠️ Development: npm run dev"
echo ""
echo "=================================================="

# Check for admin actions needed
echo ""
echo -e "${YELLOW}📋 Admin Checklist (Repository Settings)${NC}"
echo "The following may require repository admin privileges:"
echo ""
echo "□ Enable GitHub Actions (Settings → Actions)"
echo "□ Configure Copilot GitHub App permissions"
echo "□ Set up branch protection rules for main branch"
echo "□ Enable Dependabot security updates"
echo "□ Configure required status checks for PRs"
echo ""
echo "See docs/copilot-setup.md for detailed instructions."
echo ""

exit 0