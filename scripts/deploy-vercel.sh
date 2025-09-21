#!/bin/bash

# Vercel Deployment Script for SEO Phase 1
# Run this script when GitHub access is restored

echo "🚀 Starting Vercel deployment for SEO Phase 1..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if Prisma is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js and npm."
    exit 1
fi

echo "🔧 Preparing for deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# Run type check
echo "🔍 Running type check..."
npm run typecheck

# Run linting
echo "🧹 Running linter..."
npm run lint:check

# Build the project
echo "🏗️ Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set environment variables in Vercel dashboard"
    echo "2. Run database migrations: npx prisma migrate deploy"
    echo "3. Test the SEO audit functionality"
    echo "4. Configure external API keys (Ahrefs, SEMrush)"
    echo ""
    echo "🔗 Vercel Dashboard: https://vercel.com/dashboard"
else
    echo "❌ Deployment failed. Please check the errors and try again."
    exit 1
fi
