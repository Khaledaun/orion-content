# Orion Content Platform - Phase 1 Setup Guide

## Overview
This guide provides comprehensive setup instructions for the Orion Content Platform Phase 1 implementation, including all three development streams: Core Platform, Security & Monitoring, and Quality Framework.

## Prerequisites

### System Requirements
- Node.js 18+ and npm
- Python 3.8+
- PostgreSQL 14+ (or Neon Database)
- Redis (for caching and rate limiting)
- Git

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database"
DIRECT_URL="postgresql://username:password@host:port/database"

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# API Keys
OPENAI_API_KEY="your-openai-api-key"
PERPLEXITY_API_KEY="your-perplexity-api-key"

# Google Services
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GA4_PROPERTY_ID="your-ga4-property-id"
GSC_SITE_URL="your-search-console-site-url"

# WordPress Integration
WORDPRESS_API_URL="your-wordpress-site-url"
WORDPRESS_USERNAME="your-wordpress-username"
WORDPRESS_APP_PASSWORD="your-wordpress-app-password"

# 10Web Integration
TENWEBIO_API_KEY="your-10web-api-key"

# Security & Monitoring
ENCRYPTION_KEY="your-32-character-encryption-key"
RATE_LIMIT_REDIS_URL="redis://localhost:6379"

# Quality Framework
LIGHTHOUSE_SERVER_URL="http://localhost:9222"
```

## Installation Steps

### 1. Clone and Setup Repository

```bash
git clone https://github.com/Khaledaun/orion-content.git
cd orion-content
npm install
```

### 2. Database Setup

#### Using Neon Database (Recommended)
1. Create a Neon database at https://neon.tech
2. Copy the connection string to `DATABASE_URL` and `DIRECT_URL`
3. Run migrations:

```bash
npx prisma generate
npx prisma db push
```

#### Using Local PostgreSQL
1. Install PostgreSQL
2. Create database: `createdb orion_content`
3. Update connection strings in `.env`
4. Run migrations as above

### 3. Python Environment Setup

```bash
cd python
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Redis Setup (for Rate Limiting)

#### Using Docker
```bash
docker run -d -p 6379:6379 redis:alpine
```

#### Using Local Installation
```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# macOS
brew install redis
brew services start redis
```

## Development Environment

### 1. Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

### 2. Start Python Services

```bash
cd python
source .venv/bin/activate
python -m pytest  # Run tests
```

### 3. Background Services

For full functionality, ensure these services are running:
- Redis server (port 6379)
- PostgreSQL database
- Lighthouse CI server (for quality framework)

## Test User Credentials

### Default Admin User
- **Email**: admin@orion-content.local
- **Password**: OrionAdmin2024!
- **Role**: ADMIN
- **Permissions**: Full system access

### Content Manager User
- **Email**: manager@orion-content.local
- **Password**: OrionManager2024!
- **Role**: CONTENT_MANAGER
- **Permissions**: Content creation, site management

### Reviewer User
- **Email**: reviewer@orion-content.local
- **Password**: OrionReviewer2024!
- **Role**: REVIEWER
- **Permissions**: Content review, quality assurance

### Viewer User
- **Email**: viewer@orion-content.local
- **Password**: OrionViewer2024!
- **Role**: VIEWER
- **Permissions**: Read-only access

## Configuration

### 1. Initial Setup Wizard
1. Navigate to http://localhost:3000/setup
2. Configure API keys and integrations
3. Set up initial site configuration
4. Create admin user account

### 2. Site Configuration
1. Go to http://localhost:3000/sites
2. Add your first site with WordPress/10Web credentials
3. Configure content automation rules
4. Set up quality thresholds

### 3. Security Configuration
1. Navigate to http://localhost:3000/credentials
2. Configure encrypted credential storage
3. Set up rate limiting rules
4. Configure audit logging

## Verification Steps

### 1. Health Check
Visit http://localhost:3000/api/health to verify all systems are operational.

### 2. Authentication Test
1. Visit http://localhost:3000/login
2. Log in with test credentials
3. Verify role-based access control

### 3. API Endpoints Test
```bash
# Test API health
curl http://localhost:3000/api/health

# Test authentication
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@orion-content.local","password":"OrionAdmin2024!"}'
```

### 4. Database Verification
```bash
npx prisma studio
```
This opens a web interface to browse your database.

## Troubleshooting

### Common Issues

#### Database Connection Issues
- Verify DATABASE_URL format
- Check database server is running
- Ensure database exists and user has permissions

#### Authentication Issues
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain
- Clear browser cookies and try again

#### API Key Issues
- Verify all required API keys are set
- Check API key permissions and quotas
- Test API keys independently

#### Rate Limiting Issues
- Ensure Redis is running
- Check RATE_LIMIT_REDIS_URL connection
- Verify Redis connectivity: `redis-cli ping`

### Logs and Debugging

#### Application Logs
```bash
# Development logs
npm run dev

# Production logs
npm run build && npm start
```

#### Database Logs
```bash
# View Prisma logs
DEBUG="prisma*" npm run dev
```

#### Python Service Logs
```bash
cd python
python -c "import logging; logging.basicConfig(level=logging.DEBUG)"
```

## Production Deployment

### Environment Preparation
1. Set NODE_ENV=production
2. Update NEXTAUTH_URL to production domain
3. Use production database credentials
4. Configure proper SSL certificates

### Build and Deploy
```bash
npm run build
npm start
```

### Security Checklist
- [ ] All API keys are properly secured
- [ ] Database credentials are encrypted
- [ ] Rate limiting is configured
- [ ] HTTPS is enabled
- [ ] Security headers are set
- [ ] Audit logging is active

## Support and Documentation

- **Technical Documentation**: See `/docs` directory
- **API Documentation**: Available at `/api/docs` when running
- **Phase 1 Report**: See `PHASE1_IMPLEMENTATION_REPORT.md`
- **GitHub Issues**: https://github.com/Khaledaun/orion-content/issues

For additional support, refer to the comprehensive validation guide in `VALIDATION.md`.
