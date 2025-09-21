@echo off
REM Vercel Deployment Script for SEO Phase 1 (Windows)
REM Run this script when GitHub access is restored

echo 🚀 Starting Vercel deployment for SEO Phase 1...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing Vercel CLI...
    npm install -g vercel
)

REM Check if npx is available
npx --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: npx not found. Please install Node.js and npm.
    pause
    exit /b 1
)

echo 🔧 Preparing for deployment...

REM Install dependencies
echo 📦 Installing dependencies...
npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies.
    pause
    exit /b 1
)

REM Generate Prisma client
echo 🗄️ Generating Prisma client...
npx prisma generate
if errorlevel 1 (
    echo ❌ Failed to generate Prisma client.
    pause
    exit /b 1
)

REM Run type check
echo 🔍 Running type check...
npm run typecheck
if errorlevel 1 (
    echo ❌ Type check failed.
    pause
    exit /b 1
)

REM Run linting
echo 🧹 Running linter...
npm run lint:check
if errorlevel 1 (
    echo ❌ Linting failed.
    pause
    exit /b 1
)

REM Build the project
echo 🏗️ Building project...
npm run build
if errorlevel 1 (
    echo ❌ Build failed. Please fix the errors and try again.
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
vercel --prod
if errorlevel 1 (
    echo ❌ Deployment failed. Please check the errors and try again.
    pause
    exit /b 1
)

echo 🎉 Deployment successful!
echo.
echo 📋 Next steps:
echo 1. Set environment variables in Vercel dashboard
echo 2. Run database migrations: npx prisma migrate deploy
echo 3. Test the SEO audit functionality
echo 4. Configure external API keys (Ahrefs, SEMrush)
echo.
echo 🔗 Vercel Dashboard: https://vercel.com/dashboard

pause
