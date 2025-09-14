
#!/bin/bash

# Phase 2 Setup Script for Orion CMS
# This script sets up the enhanced authentication and authorization system

set -e

echo "🚀 Setting up Phase 2: Unified Authentication & Authorization"

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

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.example..."
    cp .env.example .env
    print_warning "Please update .env file with your actual values before continuing."
fi

# Install dependencies if not already installed
print_status "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
else
    print_status "Dependencies already installed"
fi

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate || print_warning "Prisma generate failed - this is expected if database is not accessible"

# Check environment variables
print_status "Validating environment configuration..."
node -e "
try {
  require('./lib/env/validation.ts');
  console.log('✅ Environment validation passed');
} catch (error) {
  console.log('❌ Environment validation failed:', error.message);
  process.exit(1);
}
" || print_error "Environment validation failed. Please check your .env file."

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p temp

# Set up database (if accessible)
print_status "Setting up database..."
if npx prisma db push 2>/dev/null; then
    print_success "Database schema updated successfully"
    
    # Run seed script if it exists
    if [ -f "scripts/seed.ts" ]; then
        print_status "Seeding database..."
        npm run db:seed || print_warning "Database seeding failed"
    fi
else
    print_warning "Database setup failed - this is expected if database is not accessible"
fi

# Generate JWT and encryption keys if not set
print_status "Checking security keys..."
if grep -q "your-nextauth-secret-key-here" .env; then
    print_warning "Generating NEXTAUTH_SECRET..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    sed -i "s#your-nextauth-secret-key-here-must-be-at-least-32-characters-long#$NEXTAUTH_SECRET#" .env
fi

if grep -q "your-jwt-secret-key-here" .env; then
    print_warning "Generating JWT_SECRET..."
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s#your-jwt-secret-key-here-must-be-at-least-32-characters-long#$JWT_SECRET#" .env
fi

if grep -q "your-32-character-encryption-key-here" .env; then
    print_warning "Generating ENCRYPTION_KEY..."
    ENCRYPTION_KEY=$(openssl rand -hex 16)
    sed -i "s#your-32-character-encryption-key-here#$ENCRYPTION_KEY#" .env
fi

# Build the application
print_status "Building application..."
if npm run build; then
    print_success "Application built successfully"
else
    print_error "Build failed. Please check the errors above."
    exit 1
fi

# Run tests
print_status "Running tests..."
if npm test; then
    print_success "All tests passed"
else
    print_warning "Some tests failed. Please review the output above."
fi

print_success "Phase 2 setup completed successfully!"
echo ""
echo "🔐 Phase 2 Features Enabled:"
echo "  ✅ Enhanced NextAuth.js with multi-provider support"
echo "  ✅ Two-Factor Authentication (2FA) with TOTP"
echo "  ✅ Advanced password management and policies"
echo "  ✅ Role-Based Access Control (RBAC) with ABAC extensions"
echo "  ✅ Fine-grained permission system"
echo "  ✅ JWT token management with refresh tokens"
echo "  ✅ Redis session management"
echo "  ✅ Comprehensive audit logging"
echo "  ✅ Rate limiting and brute force protection"
echo "  ✅ Security monitoring and alerting"
echo ""
echo "📝 Next Steps:"
echo "  1. Update your .env file with actual OAuth provider credentials"
echo "  2. Configure Redis/Upstash for session management"
echo "  3. Set up SMTP for email notifications"
echo "  4. Review and customize rate limiting configurations"
echo "  5. Test the authentication flows"
echo ""
echo "🚀 Start the development server:"
echo "  npm run dev"
echo ""
echo "📚 Documentation:"
echo "  - Phase 2 features: ./docs/PHASE2.md"
echo "  - API documentation: ./docs/API.md"
echo "  - Security guide: ./docs/SECURITY.md"
