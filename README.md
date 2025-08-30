
# Orion Content Management System

A Next.js 14 content management console for editorial workflows.

## Features

- **Authentication**: Simple email/password auth using iron-session
- **Site Management**: Create and manage content sites
- **Week Management**: Review and approve weekly content batches
- **Topics**: Manage content topics and categories
- **Job Monitoring**: Track system jobs and processes

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- iron-session for authentication
- bcrypt for password hashing

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

## License

MIT
