# Database Setup Guide

This guide covers the database setup and configuration options for the Orion Content Management System.

## Overview

Orion CMS supports multiple database deployment modes to accommodate different environments and requirements:

- **Local Development**: PostgreSQL via Docker Compose
- **Serverless/Edge**: Prisma Accelerate with connection pooling
- **Direct Connection**: Traditional PostgreSQL connection
- **Neon Serverless**: Optimized for Neon's serverless PostgreSQL

## Database Modes

### 1. Local Development (`local`)

Best for: Local development and testing

```bash
# Environment configuration
DB_MODE=local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/orion_dev"
```

**Setup:**
```bash
# Start local PostgreSQL
docker-compose up -d postgres

# Run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### 2. Prisma Accelerate (`accelerate`)

Best for: Edge runtime, serverless functions, high-traffic applications

```bash
# Environment configuration
DB_MODE=accelerate
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY"
MIGRATE_DATABASE_URL="postgresql://user:pass@host:port/db"
```

**Features:**
- Connection pooling and caching
- Edge runtime compatibility
- Global CDN for reduced latency
- Automatic query optimization

**Setup:**
1. Create a Prisma Data Platform account
2. Enable Accelerate for your project
3. Get your Accelerate connection string
4. Configure environment variables

### 3. Direct Connection (`direct`)

Best for: Traditional server deployments, VPS, dedicated servers

```bash
# Environment configuration
DB_MODE=direct
DATABASE_URL="postgresql://user:pass@host:port/database"
MIGRATE_DATABASE_URL="postgresql://user:pass@host:port/database"
```

### 4. Neon Serverless (`neon-serverless`)

Best for: Serverless deployments with Neon PostgreSQL

```bash
# Environment configuration
DB_MODE=neon-serverless
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require&connect_timeout=15"
```

**Optimizations:**
- Serverless driver integration
- Connection timeout handling
- Automatic connection pooling

## Environment Variables

### Required Variables

```bash
# Database mode selection
DB_MODE=local|accelerate|direct|neon-serverless

# Primary database URL
DATABASE_URL="your-database-connection-string"

# Migration URL (for accelerate mode)
MIGRATE_DATABASE_URL="direct-database-connection-string"
```

### Optional Configuration

```bash
# Database pooling
DB_POOLING_ENABLED=true
DB_MAX_CONNECTIONS=20
DB_TIMEOUT=15

# Runtime configuration
FORCE_EDGE_RUNTIME=false
FORCE_NODEJS_RUNTIME=false

# Prisma configuration
PRISMA_ACCELERATE_ENABLED=true
PRISMA_GENERATE_NO_ENGINE=true
```

## Connection String Formats

### PostgreSQL (Standard)
```
postgresql://username:password@hostname:port/database?options
```

### Prisma Accelerate
```
prisma://accelerate.prisma-data.net/?api_key=your-api-key
```

### Neon (Optimized)
```
postgresql://user:pass@host:port/db?sslmode=require&connect_timeout=15&connection_limit=20&pool_timeout=15
```

## Migration Commands

```bash
# Development migrations
npm run db:migrate

# Production migrations
npm run db:migrate:prod

# Generate Prisma client
npm run db:generate

# Reset database (development only)
npm run db:reset

# Push schema changes (development)
npm run db:push
```

## Health Checks

The system includes comprehensive database health monitoring:

```bash
# Check database connectivity
npm run db:health

# API health endpoint
curl http://localhost:3000/api/health

# Comprehensive health check
./scripts/health-check.sh
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Increase `connect_timeout` in connection string
   - Check network connectivity
   - Verify database server is running

2. **Edge Runtime Errors**
   - Ensure using Prisma Accelerate for Edge runtime
   - Check `FORCE_EDGE_RUNTIME` configuration
   - Verify bundle size limits

3. **Migration Failures**
   - Use `MIGRATE_DATABASE_URL` for direct connections
   - Check database permissions
   - Verify schema compatibility

4. **Prisma Client Issues**
   - Regenerate client: `npm run db:generate`
   - Clear Prisma cache: `rm -rf node_modules/.prisma`
   - Check Prisma version compatibility

### Performance Optimization

1. **Connection Pooling**
   ```bash
   DB_POOLING_ENABLED=true
   DB_MAX_CONNECTIONS=20
   DB_TIMEOUT=15
   ```

2. **Query Optimization**
   - Use Prisma Accelerate for caching
   - Implement proper indexing
   - Monitor query performance

3. **Serverless Optimization**
   - Use connection pooling
   - Implement query caching
   - Optimize cold start times

## Security Considerations

1. **Connection Security**
   - Always use SSL in production (`sslmode=require`)
   - Rotate database credentials regularly
   - Use environment variables for secrets

2. **Access Control**
   - Implement proper database user permissions
   - Use read-only connections where appropriate
   - Monitor database access logs

3. **Data Protection**
   - Enable database encryption at rest
   - Implement backup strategies
   - Use connection string encryption

## Monitoring and Observability

The system includes built-in database monitoring:

- Connection health checks
- Query performance metrics
- Error tracking and alerting
- Database usage statistics

Access monitoring through:
- `/api/health` endpoint
- Prisma Studio: `npm run db:studio`
- Application logs and metrics

## Production Deployment

### Checklist

- [ ] Database mode configured correctly
- [ ] Connection strings secured
- [ ] Migrations applied
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security measures in place

### Best Practices

1. Use Prisma Accelerate for serverless deployments
2. Implement proper connection pooling
3. Monitor database performance
4. Set up automated backups
5. Use environment-specific configurations
6. Test migration strategies
7. Implement proper error handling

For more detailed configuration examples, see the `.env.example` file in the project root.
