
# Orion Content Management - Python Pipelines

This Python package provides command-line tools for managing content topics and WordPress publishing as part of the Orion Content Management System.

## Features

- **Topic Generation**: Automatically generate trending topics for weekly content planning
- **WordPress Publishing**: Create WordPress drafts via REST API with dry-run support
- **Audit Tools**: List and review recent WordPress posts
- **API Integration**: Full integration with Orion Content Management API

## Quick Start

### 1. Installation

```bash
cd python
make install
```

### 2. Configuration

Set required environment variables:

```bash
export ORION_BASE_URL="http://localhost:3000"
export ORION_CONSOLE_TOKEN="your-console-api-token"

# Optional WordPress configuration
export WP_BASE_URL="https://your-wordpress-site.com"
export WP_USERNAME="your-wp-username"
export WP_APP_PASSWORD="your-wp-app-password"
```

### 3. Basic Usage

Generate topics for the current week:
```bash
python -m orion.gather_trends --site-key my-site --count 30
```

Create a WordPress draft:
```bash
python -m orion.publish.publisher_wp --title "Hello World" --content "Test post content"
```

Audit recent drafts:
```bash
python -m orion.audit.audit_wp --limit 10
```

## Commands

### `orion.gather_trends`

Generate trending topics for the current week.

```bash
python -m orion.gather_trends --site-key SITE_KEY [options]

Options:
  --site-key SITE_KEY   Site key to generate topics for (required)
  --count COUNT         Number of topics to generate (default: 30)
  --start-date DATE     Start date for week in YYYY-MM-DD format
  --dry-run             Generate topics but don't post to API
```

**Example:**
```bash
python -m orion.gather_trends --site-key tech-blog --count 25 --dry-run
```

### `orion.publish.publisher_wp`

Create WordPress posts (drafts by default).

```bash
python -m orion.publish.publisher_wp --title TITLE --content CONTENT [options]

Options:
  --title TITLE         Post title (required)
  --content CONTENT     Post content, HTML allowed (required)  
  --status STATUS       Post status: draft|publish (default: draft)
  --categories CATS     Comma-separated category names
```

**Examples:**
```bash
# Create a draft (dry-run if WP not configured)
python -m orion.publish.publisher_wp \
  --title "AI Trends 2024" \
  --content "<p>Latest developments in AI...</p>"

# Publish with categories
python -m orion.publish.publisher_wp \
  --title "Breaking: New Tech Release" \
  --content "Content here..." \
  --status publish \
  --categories "Technology,News"
```

### `orion.audit.audit_wp`

List and review recent WordPress posts.

```bash
python -m orion.audit.audit_wp [options]

Options:
  --limit LIMIT     Number of posts to show (default: 10)
  --status STATUS   Post status: draft|publish|private|any (default: draft)
```

**Example:**
```bash
python -m orion.audit.audit_wp --limit 20 --status any
```

## Configuration Details

### Required Environment Variables

- `ORION_CONSOLE_TOKEN`: API token for Orion Content Management System
- `ORION_BASE_URL`: Base URL of your Orion instance (default: http://localhost:3000)

### Optional WordPress Environment Variables

If not set, WordPress commands will run in dry-run mode:

- `WP_BASE_URL`: Your WordPress site URL (e.g., https://myblog.com)
- `WP_USERNAME`: WordPress username
- `WP_APP_PASSWORD`: WordPress Application Password (not regular password)

### Creating WordPress App Passwords

1. Go to your WordPress admin → Users → Your Profile
2. Scroll to "Application Passwords" section
3. Enter a name (e.g., "Orion Pipeline") and click "Add New Application Password"
4. Copy the generated password and use it as `WP_APP_PASSWORD`

## Development

### Running Tests

```bash
make test
```

### Code Structure

- `orion/config.py` - Configuration and session management
- `orion/api_client.py` - Orion API client with Bearer authentication
- `orion/gather_trends.py` - Topic generation CLI
- `orion/publish/publisher_wp.py` - WordPress publishing CLI  
- `orion/audit/audit_wp.py` - WordPress audit CLI
- `tests/` - Pytest test suite

### Building Package

```bash
make package
```

This creates `orion-phase3-python.zip` in the parent directory.

## API Integration

The Python tools integrate with these Orion API endpoints:

- `GET /api/health` - Health check
- `GET /api/sites` - List sites and categories
- `POST /api/weeks` - Create/get current week  
- `POST /api/weeks/{id}/topics` - Bulk create topics
- `POST /api/jobrun` - Record job runs (optional)

All API calls use Bearer authentication with the `ORION_CONSOLE_TOKEN`.

## Error Handling

- **Network errors**: Commands will retry with exponential backoff
- **API errors**: Full error details including status codes and response bodies
- **Missing configuration**: Graceful dry-run mode for WordPress commands
- **Validation errors**: Clear messages for malformed requests

## Common Gotchas

1. **Missing Bearer Token**: Ensure `ORION_CONSOLE_TOKEN` is set and valid
2. **Site Key Not Found**: Check that the site exists in Orion using the exact key
3. **Schema Mismatches**: Topic creation requires `siteId`, `categoryId`, and `title` fields
4. **WordPress Auth**: Use Application Passwords, not regular account passwords
5. **API Timeouts**: Default 30-second timeout; check network connectivity for slow responses
6. **ISO Week Boundaries**: Weeks start on Monday following ISO 8601 standard

## License

MIT License - see parent project for full license text.
