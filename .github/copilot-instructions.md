# GitHub Copilot Instructions for Orion Content

## Repository Context

This is the Orion Content Management System, a Next.js application with TypeScript, Prisma, and Edge Runtime compatibility. The application focuses on content management, analytics, user authentication, and multi-site support.

## Code Generation Guidelines

### Framework and Architecture

- **Next.js 14.2.28** with App Router
- **TypeScript 5.6.2** with strict mode enabled
- **React 18.2.0** with functional components and hooks
- **Prisma 6.16.1** for database operations
- **Vercel Edge Runtime** compatibility required
- **TailwindCSS** for styling with Radix UI components

### Code Quality Standards

1. **TypeScript**: All code must be strictly typed with proper interfaces
2. **Error Handling**: Comprehensive error boundaries and try-catch blocks
3. **Performance**: Edge Runtime compatible, no Node.js-specific APIs
4. **Security**: Input validation, sanitization, and proper authentication
5. **Accessibility**: WCAG 2.1 AA compliance for all UI components

### Database Operations

- Use Prisma Client with proper error handling
- Implement connection pooling and transaction management
- Validate schema changes for production compatibility
- Follow database naming conventions (camelCase for fields)

### Authentication & Security

- NextAuth.js with Prisma adapter for session management
- Implement role-based access control (RBAC)
- Use secure password hashing with bcryptjs
- Validate all user inputs and sanitize outputs
- Implement rate limiting for API endpoints

### API Development

- RESTful design with proper HTTP status codes
- Edge Runtime compatible (no Node.js APIs like `fs`, `process.env` in runtime)
- Implement proper error responses and logging
- Use middleware for authentication and validation
- Follow OpenAPI specification for documentation

### Frontend Components

- Use Radix UI primitives with custom styling
- Implement responsive design (mobile-first)
- Use React Hook Form with Zod validation
- Implement proper loading states and error boundaries
- Follow component composition patterns

### Testing Requirements

- Unit tests for utility functions and components
- Integration tests for API endpoints
- E2E tests for critical user journeys
- Performance testing for Core Web Vitals
- Security testing for vulnerabilities

### Performance Optimization

- Bundle size optimization (<1MB initial load)
- Image optimization with Next.js Image component
- Lazy loading for non-critical components
- Proper caching strategies (SWR/React Query)
- Core Web Vitals optimization (LCP <2.5s, FID <100ms, CLS <0.1)

## File Structure Conventions

### Component Organization

```
components/
├── ui/              # Reusable UI components
├── layout/          # Layout components (headers, navigation)
├── forms/           # Form components with validation
├── charts/          # Data visualization components
└── [feature]/       # Feature-specific components
```

### API Routes

```
app/api/
├── auth/           # Authentication endpoints
├── [entity]/       # CRUD operations for entities
├── analytics/      # Analytics and reporting
└── webhooks/       # External service integrations
```

### Library Organization

```
lib/
├── auth/           # Authentication utilities
├── database/       # Database utilities and schemas
├── validation/     # Input validation schemas
├── utils/          # Utility functions
└── [service]/      # External service integrations
```

## Code Review Checklist

### Functionality

- [ ] Code implements requirements correctly
- [ ] Edge cases are handled appropriately
- [ ] Error handling is comprehensive
- [ ] Performance implications are considered

### Security

- [ ] Input validation is implemented
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (proper escaping)
- [ ] Authentication/authorization checks
- [ ] Sensitive data is not logged or exposed

### Code Quality

- [ ] TypeScript types are properly defined
- [ ] Code follows naming conventions
- [ ] Functions are pure and testable
- [ ] Dependencies are minimal and necessary
- [ ] Code is readable and well-documented

### Testing

- [ ] Unit tests cover critical functionality
- [ ] Integration tests validate API endpoints
- [ ] Edge cases are tested
- [ ] Performance impact is validated

### Deployment

- [ ] Environment variables are properly configured
- [ ] Database migrations are safe and reversible
- [ ] Build process completes successfully
- [ ] No breaking changes to existing functionality

## Integration Patterns

### Third-Party Services

- **Google Analytics 4**: Use official client with proper error handling
- **WordPress**: REST API integration with authentication
- **OpenAI**: Secure API key management and rate limiting
- **Redis**: Session storage and caching with fallback strategies

### Monitoring and Observability

- Structured logging with Pino
- Error tracking and performance monitoring
- Health checks for all external dependencies
- Metrics collection for business KPIs

## Deployment Considerations

### Vercel Edge Runtime

- Avoid Node.js APIs (`fs`, `path`, `crypto` from node)
- Use Web APIs (`fetch`, `crypto` from web)
- Optimize for cold start performance
- Implement proper error handling for edge cases

### Database

- Connection pooling for performance
- Proper migration strategies
- Backup and recovery procedures
- Performance monitoring and optimization

### Environment Management

- Secure secret management
- Environment-specific configurations
- Proper fallback values for missing environment variables
- Validation of required environment variables at startup

## Best Practices

### Documentation

- README files for complex features
- Inline comments for business logic
- API documentation with examples
- Deployment and setup instructions

### Version Control

- Meaningful commit messages
- Feature branches for new development
- Proper PR descriptions with testing notes
- Changelog maintenance for releases

### Monitoring

- Application performance monitoring
- Error rate tracking
- User experience metrics
- Security incident response procedures

This guidance ensures consistent, secure, and performant code that aligns with the Orion Content Management System's architecture and requirements.
