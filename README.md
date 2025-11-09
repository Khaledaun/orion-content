# Orion Content Management System

A Next.js 14 content management console for editorial workflows.

## Features

- **Authentication**: Enterprise-grade RBAC with role-based permissions
- **Site Management**: Create and manage content sites with multilingual support
- **Content Pipeline**: AI-powered content generation with quality assurance
- **WordPress Integration**: One-click publishing to WordPress with rulebook guardrails
- **Quality Framework**: Comprehensive rulebook QA with E-E-A-T, SEO, and AI search optimization
- **Observability**: Real-time cost tracking, performance monitoring, and analytics
- **Multilingual Support**: Arabic, Hebrew, English with RTL handling
- **Enterprise Security**: Audit logs, encrypted credentials, and compliance features

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- iron-session for authentication
- bcrypt for password hashing
- WordPress REST API integration
- Redis for caching and metrics
- Enterprise-grade encryption (AES-256-GCM)

## Quick Start

1. **Install dependencies:**

   ```bash
   cd app
   yarn install
   ```

2. **Set environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Set up database:**

   ```bash
   yarn prisma generate
   yarn prisma db push
   yarn prisma db seed
   ```

4. **Start development server:**

   ```bash
   yarn dev
   ```

5. **Login:**
   - Visit http://localhost:3000
   - Use the admin credentials from your .env file

## WordPress Integration

Orion provides enterprise-grade WordPress integration for seamless content publishing:

### **Features**

- **One-Click Publishing**: Stream drafts to WordPress and publish with quality guardrails
- **Rulebook Integration**: Prevent low-quality content from publishing
- **Real-time Monitoring**: Track publishing success, costs, and performance
- **Multilingual Support**: Preserve Arabic, Hebrew, and English content
- **RBAC Controls**: Role-based publishing permissions
- **Audit Logging**: Complete audit trail for all WordPress actions

### **Setup**

1. **Connect WordPress Site**:
   - Go to Settings → WordPress Integration
   - Add your WordPress site URL and credentials
   - Generate WordPress application password
   - Test connection

2. **Publish Content**:
   - Create and approve content in Orion
   - Use one-click publish with quality checks
   - Monitor publishing success and costs
   - Track performance in real-time dashboard

### **Pilot Program**

Join our WordPress Agency Pilot Program to experience:

- **10-minute onboarding** to first connected WordPress site
- **5-minute time-to-first-draft** after topic approval
- **90%+ publishing success rate** with quality guardrails
- **< $2 cost per article** at scale
- **2× editor efficiency** vs manual content creation

See [WordPress Pilot Guide](WORDPRESS_PILOT_GUIDE.md) for detailed setup instructions.

## Project Structure

```
app/
├── app/                 # Next.js app router pages
├── api/                 # API routes
├── components/          # Reusable components
├── lib/                 # Utilities and configuration
├── prisma/              # Database schema
└── scripts/             # Utility scripts
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for cookie sessions
- `ADMIN_EMAIL` - Admin user email for seeding
- `ADMIN_PASSWORD` - Admin user password for seeding

## Deployment & QA Checklist

### Test and Deploy Script

The project includes a comprehensive test and deploy script that automates foundation feature validation and deployments for staging and production environments.

#### Quick Start

```bash
# Test and deploy to staging (default)
npm run test-deploy

# Deploy to production
PRODUCTION=1 npm run test-deploy

# Skip tests for faster deployment (not recommended)
npm run test-deploy -- --skip-tests

# Skip build step (for testing script logic)
npm run test-deploy -- --skip-build
```

#### What the Script Does

1. **Automated Testing**
   - TypeScript compilation check
   - ESLint code quality validation
   - Unit tests execution
   - Integration tests execution
   - Fails deployment if any tests fail

2. **Optimized Build**
   - Sets appropriate Node.js heap size (2GB staging, 4GB production)
   - Runs production build with optimizations
   - Validates build completion

3. **Deployment**
   - Deploys to Vercel (staging or production)
   - Logs deployment URL and status
   - Handles deployment errors gracefully

4. **Test Account Seeding**
   - Creates test accounts for different plan types:
     - Starter: `starter@orion-test.local` / `StarterTest2024!`
     - Pro: `pro@orion-test.local` / `ProTest2024!`
     - Guru: `guru@orion-test.local` / `GuruTest2024!`

5. **Endpoint Validation**
   - Tests core API endpoints: `/api/health`, `/api/ops/status`, auth endpoints
   - Validates Phase 4-Pro endpoints: `/api/seo-audit`, `/api/integrations/ga4`, `/api/integrations/gsc`, `/api/ai-prompt-engineer`
   - Reports response times and success rates

6. **Deployment Report**
   - Generates JSON report with test results, deployment status, and endpoint validation
   - Saves to `deployment-report-{environment}-{timestamp}.json`

7. **Manual QA Checklist**
   - Prints comprehensive checklist for manual validation
   - Includes authentication, core features, API endpoints, performance, and cross-browser testing

#### CI/CD Integration

For GitHub Actions or other CI/CD systems:

```yaml
- name: Test and Deploy
  run: npm run test-deploy
  env:
    VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    STAGING: "1" # or PRODUCTION: "1" for production
```

#### Manual Usage

The script is designed to be run both in CI/CD environments and locally by developers:

```bash
# Local staging deployment
VERCEL_TOKEN=your_token npm run test-deploy

# Local production deployment
VERCEL_TOKEN=your_token PRODUCTION=1 npm run test-deploy
```

#### Environment Variables for Deployment

Required for deployment:

- `VERCEL_TOKEN` - Vercel deployment token
- `DATABASE_URL` - Production database connection
- `NEXTAUTH_SECRET` - NextAuth secret for production
- `NEXTAUTH_URL` - Production URL for NextAuth

Optional:

- `STAGING_URL` - Override default staging URL
- `PRODUCTION_URL` - Override default production URL

#### Post-Deployment Validation

After successful deployment, complete the manual QA checklist:

**Authentication & Security**

- [ ] Test login with valid/invalid credentials
- [ ] Verify session persistence and logout
- [ ] Check CSRF protection

**Core Application Features**

- [ ] Navigate dashboard and core features
- [ ] Test site management functionality
- [ ] Verify responsive design
- [ ] Check for JavaScript errors

**API Endpoints**

- [ ] Health check returns proper status
- [ ] Protected endpoints require authentication
- [ ] Rate limiting functions correctly
- [ ] Proper error status codes

**Production-Specific** (production deployments only)

- [ ] SSL certificate valid
- [ ] DNS settings correct
- [ ] Monitoring systems active
- [ ] Backup systems operational

**Test Account Validation**

- [ ] Login with Starter account: `starter@orion-test.local`
- [ ] Login with Pro account: `pro@orion-test.local`
- [ ] Login with Guru account: `guru@orion-test.local`

**Performance & Cross-Browser**

- [ ] Page load times under 3 seconds
- [ ] No memory leaks or performance issues
- [ ] Chrome, Firefox, Safari, Edge compatibility

#### Troubleshooting

**Build Failures**

- Check TypeScript errors: `npm run typecheck`
- Check linting issues: `npm run lint:check`
- Verify dependencies: `npm install`

**Deployment Failures**

- Verify Vercel token: `vercel whoami`
- Check environment variables in Vercel dashboard
- Review deployment logs for specific errors

**Endpoint Validation Failures**

- Check if endpoints are implemented
- Verify authentication requirements
- Test endpoints manually with curl or browser

## License

MIT
