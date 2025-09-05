# Vercel Deployment Guide

## Prerequisites

1. **Database**: Set up a PostgreSQL database (recommended: Neon, Supabase, or Vercel Postgres)
2. **Environment Variables**: Configure all required environment variables in Vercel dashboard

## Required Environment Variables

Copy these from your `.env.example` and set them in Vercel:

### Database (Required)
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct PostgreSQL connection string (for migrations)

### Authentication (Required)
- `SESSION_SECRET` - Random secret for session encryption
- `NEXTAUTH_SECRET` - Random secret for NextAuth
- `NEXTAUTH_URL` - Your Vercel app URL (e.g., https://your-app.vercel.app)
- `CONSOLE_BASE_URL` - Same as NEXTAUTH_URL
- `AUTH_TRUST_HOST` - Set to "true"

### Encryption (Required)
- `ENCRYPTION_KEY` - Base64 encoded encryption key for secrets vault

### Optional Variables
- `GOOGLE_CLIENT_ID` - For Google OAuth login
- `GOOGLE_CLIENT_SECRET` - For Google OAuth login
- `GITHUB_PAT` - For GitHub integration
- `GITHUB_MODE` - Set to "actions"
- `GITHUB_REPO_FULL` - Your GitHub repo (username/repo-name)
- `ADMIN_EMAIL` - Default admin email
- `ADMIN_PASSWORD` - Default admin password

## Deployment Steps

1. **Connect Repository**: Connect your GitHub repository to Vercel
2. **Configure Environment Variables**: Add all required environment variables in Vercel dashboard
3. **Deploy**: Vercel will automatically build and deploy your application

## Build Configuration

The project includes optimized Vercel configuration in `vercel.json`:
- Husky is disabled in CI environment
- Prisma client is generated before build
- Next.js telemetry is disabled for faster builds

## Database Setup

After deployment, you may need to run database migrations:

```bash
# If using Vercel CLI locally
vercel env pull .env.local
npx prisma migrate deploy
```

## Troubleshooting

### Build Failures
- Ensure all required environment variables are set
- Check that DATABASE_URL is accessible from Vercel
- Verify Prisma schema matches your database provider

### Runtime Issues
- Check Vercel function logs for detailed error messages
- Ensure database connection is stable
- Verify all environment variables are properly configured

## Support

For deployment issues, check:
1. Vercel build logs
2. Function logs in Vercel dashboard
3. Database connectivity
4. Environment variable configuration
