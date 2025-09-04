
# Orion Content Management System

A modern, scalable content management system built with Next.js, TypeScript, and PostgreSQL.

## Phase 1: Content Management Foundation

This phase introduces core content management capabilities including secure credential storage, article management, and local file storage.

### 🚀 Features

#### Secure Credential Management
- **AES-256-GCM Encryption**: All API keys and sensitive credentials are encrypted at rest
- **Admin UI**: Web interface for managing credentials securely
- **API Testing**: Built-in credential validation and testing
- **Audit Logging**: All credential operations are logged with sensitive data redaction

#### Article Management
- **Full CRUD Operations**: Create, read, update, and delete articles
- **Rich Content Support**: HTML content with excerpt support
- **SEO Optimization**: Built-in SEO metadata management
- **Status Management**: Draft, published, and archived states
- **Slug-based URLs**: SEO-friendly URL structure
- **Search & Filtering**: Full-text search and status-based filtering

#### Local Storage Provider
- **Organized Structure**: Automatic folder organization (articles, media, images, documents)
- **File Upload**: Secure file upload with validation
- **Storage Statistics**: Monitor storage usage and file counts
- **Cleanup Utilities**: Automatic temporary file cleanup

#### Database Schema
- **Article Model**: Complete article management with relationships
- **Media Model**: File attachment and media management
- **SEO Data Model**: Comprehensive SEO metadata storage
- **Credential Model**: Encrypted credential storage

### 🛠️ Setup Instructions

#### Prerequisites
- Node.js 18+ and pnpm
- PostgreSQL database
- Environment variables configured

#### Installation

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd orion-content
   pnpm install
   ```

2. **Environment Configuration**
   Create a `.env` file with the following variables:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/orion_cms
   
   # Encryption (generate with: openssl rand -base64 32)
   ENCRYPTION_KEY=your-base64-encoded-32-byte-key
   
   # Session
   SESSION_SECRET=your-super-secret-session-key
   
   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-nextauth-secret
   
   # Admin User (for seeding)
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=admin123
   ```

3. **Database Setup**
   ```bash
   # Generate Prisma client
   pnpm prisma generate
   
   # Run database migrations
   pnpm prisma migrate dev --name phase1-foundation
   
   # Seed initial data (optional)
   pnpm run seed
   ```

4. **Development Server**
   ```bash
   pnpm dev
   ```

   The application will be available at `http://localhost:3000`

#### Production Deployment

1. **Build the Application**
   ```bash
   pnpm build
   ```

2. **Start Production Server**
   ```bash
   pnpm start
   ```

### 📚 API Documentation

#### Credential Management Endpoints

- `GET /api/admin/credentials` - List all credentials
- `POST /api/admin/credentials` - Create new credential
- `GET /api/admin/credentials/[id]` - Get specific credential
- `PUT /api/admin/credentials/[id]` - Update credential
- `DELETE /api/admin/credentials/[id]` - Delete credential
- `POST /api/admin/credentials/test` - Test credential

#### Article Management Endpoints

- `GET /api/articles` - List articles (with pagination and filtering)
- `POST /api/articles` - Create new article
- `GET /api/articles/[id]` - Get specific article
- `PUT /api/articles/[id]` - Update article
- `DELETE /api/articles/[id]` - Delete article
- `POST /api/articles/[id]/publish` - Publish article
- `GET /api/articles/slug/[slug]` - Get article by slug

#### Query Parameters for Article Listing

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `status` - Filter by status (DRAFT, PUBLISHED, ARCHIVED)
- `siteId` - Filter by site
- `categoryId` - Filter by category
- `search` - Full-text search in title, content, and excerpt
- `sortBy` - Sort field (createdAt, updatedAt, publishedAt, title)
- `sortOrder` - Sort direction (asc, desc)

### 🧪 Testing

#### Run Smoke Tests
```bash
# Install test dependencies
pnpm add -D jest @types/jest ts-jest

# Run Phase 1 smoke tests
pnpm test test/smoke/phase1.spec.ts
```

The smoke tests cover:
- Encryption and security validation
- Credential CRUD operations
- Article management functionality
- Local storage operations
- Database schema validation

#### API Testing with Postman/Bruno

Import the provided collection:
- **File**: `collections/orion_phase1.postman_collection.json`
- **Base URL**: `http://localhost:3000`

The collection includes:
- Health check endpoints
- Complete credential management workflow
- Article CRUD operations
- File upload and storage management
- Admin and system endpoints

### 🔒 Security Features

#### Data Encryption
- All sensitive credentials encrypted with AES-256-GCM
- Unique initialization vectors for each encryption
- Additional authenticated data (AAD) for integrity

#### Logging Security
- Automatic redaction of sensitive data in logs
- Pattern-based detection of API keys, passwords, and tokens
- Safe error handling without data exposure

#### Input Validation
- Zod schema validation for all API inputs
- File upload restrictions and validation
- SQL injection prevention through Prisma ORM

### 📁 Project Structure

```
src/
├── lib/crypto/           # Encryption utilities
├── modules/
│   ├── credentials/      # Credential management
│   └── articles/         # Article management
├── storage/              # File storage providers
├── logging/              # Security logging utilities
└── ...

test/
└── smoke/                # Smoke tests

collections/              # API testing collections
```

### 🔧 Configuration

#### Encryption Key Generation
```bash
# Generate a secure 256-bit encryption key
openssl rand -base64 32
```

#### Storage Configuration
The local storage provider creates the following folder structure:
- `uploads/articles/` - Article-related files
- `uploads/media/` - General media files
- `uploads/images/` - Image files
- `uploads/documents/` - Document files
- `uploads/temp/` - Temporary files (auto-cleanup)

### 📊 Monitoring & Observability

#### Health Checks
- `GET /api/health` - Basic API health
- `GET /api/health/db` - Database connectivity

#### Admin Endpoints
- `GET /api/admin/status` - System status
- `GET /api/admin/storage/stats` - Storage statistics

### 🚦 Next Steps

Phase 1 provides the foundation for content management. Future phases will include:
- User authentication and authorization
- Advanced media management
- Content workflow and approval processes
- Multi-site management
- API rate limiting and caching
- Advanced search and analytics

### 🤝 Contributing

1. Create a feature branch from `master`
2. Implement changes with tests
3. Run smoke tests: `pnpm test`
4. Submit a pull request

### 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
