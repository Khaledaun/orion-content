
# Phase 4: Automated Publishing & Multi-Site Orchestration

This documentation covers the automated content publishing pipeline that generates topics and creates WordPress drafts across multiple sites on a scheduled basis.

## Overview

Phase 4 introduces a complete automation system that:

- ✅ **Generates topics automatically** using existing Phase 3 logic
- ✅ **Creates WordPress drafts** with enriched content 
- ✅ **Supports multiple sites** with individual configurations
- ✅ **Runs on GitHub Actions** with cron scheduling
- ✅ **Provides comprehensive logging** and monitoring
- ✅ **Maintains idempotency** for safe re-runs
- ✅ **Supports dry-run mode** when credentials are missing

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  GitHub Actions │    │   Site Config   │    │   Orion API     │
│   (Scheduler)   │───▶│   (multisite)   │───▶│  (Topics/Week)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Content Enrich  │    │  WordPress API  │
                       │   (generate)    │───▶│   (Drafts)      │
                       └─────────────────┘    └─────────────────┘
```

## Quick Start

### 1. Single Site Setup

Set up environment variables for a single site:

```bash
export ORION_BASE_URL="https://your-orion-app.vercel.app"
export ORION_CONSOLE_TOKEN="your_console_api_token"

# WordPress credentials (optional - will run in dry-run if missing)
export WP_BASE_URL="https://your-wordpress-site.com"
export WP_USERNAME="your_wp_username"
export WP_APP_PASSWORD="your_wp_application_password"
```

Run the pipeline:

```bash
# Generate 5 topics and create WordPress drafts
make automate SITE=my-site COUNT=5

# Generate topics only (no WordPress publishing)
make automate-dry SITE=my-site COUNT=10

# Force dry-run mode
make automate-wp-dry SITE=my-site COUNT=5
```

### 2. Multi-Site Setup

Configure multiple sites in your GitHub repository secrets:

```
ORION_SITES=my-site,ai-news,crypto-digest
```

**Per-site WordPress credentials** (optional):
```
WP_BASE_URL__my_site=https://mysite.com
WP_USERNAME__my_site=mysite_user
WP_APP_PASSWORD__my_site=mysite_app_password

WP_BASE_URL__ai_news=https://ai-news.com
WP_USERNAME__ai_news=ai_user
WP_APP_PASSWORD__ai_news=ai_app_password
```

**Default WordPress credentials** (fallback):
```
WP_BASE_URL=https://default-site.com
WP_USERNAME=default_user
WP_APP_PASSWORD=default_app_password
```

### 3. GitHub Actions Automation

The pipeline runs automatically via GitHub Actions:

- **Schedule**: Twice daily at 6 AM and 4 PM UTC
- **Manual trigger**: Via workflow dispatch
- **Per-site processing**: Handles multiple sites in sequence
- **Artifact upload**: Logs are saved as artifacts

## Configuration

### Required GitHub Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `CONSOLE_BASE_URL` | Your Orion app URL | `https://your-app.vercel.app` |
| `CONSOLE_API_TOKEN` | Bearer token from Orion | `your_console_token` |

### Optional GitHub Secrets

| Secret | Description | Default | Example |
|--------|-------------|---------|---------|
| `ORION_SITES` | Comma-separated site keys | `my-site` | `my-site,ai-news,crypto-digest` |
| `TOPIC_COUNT` | Topics per site per run (supports ranges) | `5` | `5` or `3-7` |
| `ENRICH_PROMPT_STRATEGY` | Content generation strategy | `default` | `random`, `listicle_prompt.txt` |
| `WP_BASE_URL` | Default WordPress URL | None (dry-run) | `https://wordpress.com` |
| `WP_USERNAME` | Default WordPress user | None (dry-run) | `wp_user` |
| `WP_APP_PASSWORD` | Default WordPress app password | None (dry-run) | `wp_app_password` |

### Site-Specific Secrets (Optional)

Override defaults per site using pattern `<SECRET>__<SITE_KEY>`:

```
WP_BASE_URL__my_site=https://mysite.com
WP_USERNAME__my_site=mysite_user
WP_APP_PASSWORD__my_site=mysite_password
```

**Note**: Replace hyphens with underscores in site keys for environment variables.

### WordPress Application Passwords

To create WordPress application passwords:

1. Go to **Users → Your Profile** in WordPress admin
2. Scroll to **Application Passwords** section
3. Create new application password with name like "Orion Automation"
4. Copy the generated password (shown only once)
5. Use this as `WP_APP_PASSWORD` in your secrets

## Manual Usage

### Local Development

```bash
# Set up environment
export ORION_BASE_URL="http://localhost:3000"  # Your local dev server
export ORION_CONSOLE_TOKEN="your_token"

# Test single site
make automate SITE=my-site COUNT=3

# Test multi-site
export ORION_SITES="site1,site2"
for site in site1 site2; do
  make automate SITE="$site" COUNT=5
done
```

### Configuration Validation

```bash
# Validate all configured sites
make validate-config

# List configured sites
make list-sites

# Validate specific site
cd python && PYTHONPATH=. python -m orion.automate.multisite --site-key my-site
```

### Content Generation Testing

```bash
# Test content generation
make test-enrich
```

## Pipeline Stages

The automation pipeline executes these stages in sequence:

1. **Configuration Loading** - Load site-specific WordPress credentials
2. **Health Check** - Verify Orion API connectivity
3. **Week Ensure** - Create current ISO week if needed
4. **Site Loading** - Fetch site data and categories
5. **Topic Generation** - Generate N unique topics using Phase 3 logic
6. **Topic Creation** - Bulk insert topics via Orion API
7. **WordPress Publishing** - Create drafts with enriched content (if enabled)

### Logging and Monitoring

Each pipeline run generates structured logs:

```jsonl
{"ts":"2025-08-28T06:05:04Z","site":"my-site","stage":"ensure_week","ok":true,"week":"2025-W35"}
{"ts":"2025-08-28T06:05:05Z","site":"my-site","stage":"generate_topics","ok":true,"generated":5,"unique":5}
{"ts":"2025-08-28T06:05:06Z","site":"my-site","stage":"create_topics","ok":true,"submitted":5,"created":5}
{"ts":"2025-08-28T06:05:07Z","site":"my-site","stage":"wordpress_publish","ok":true,"drafts_created":5,"errors":0}
```

Logs are stored in `python/automation-logs/<site>/<YYYY-MM-DD>.jsonl` and uploaded as GitHub Actions artifacts.

## Idempotency and Safety

### Topic Deduplication
- Topics are deduplicated by title within each batch
- Safe to re-run pipeline multiple times per day
- Uses existing Phase 3 bulk topic creation (handles duplicates gracefully)

### WordPress Publishing Safety
- Only creates drafts (never publishes automatically)
- Continues processing other topics if one fails
- Dry-run mode when WordPress credentials are missing
- Error handling prevents pipeline from stopping on individual failures

### API Safety
- Uses existing Orion API endpoints with proper error handling
- Structured logging for observability
- Optional JobRun tracking integration

## Enhanced Features (Latest)

Phase 4 has been enhanced with three key intelligence features:

### 1. Multi-Prompt Content Strategy

Prevents repetitive content by using different prompt templates:

**Available Strategies:**
- `default` - Original template-based generation
- `random` - Randomly selects from available prompts
- `listicle_prompt.txt` - List-based content format
- `how_to_guide_prompt.txt` - Step-by-step instructional content
- `analysis_prompt.txt` - Analytical and research-based content
- `interview_prompt.txt` - Conversational Q&A style
- `case_study_prompt.txt` - Narrative case study format

**Configuration:**
```bash
# Global strategy for all sites
ENRICH_PROMPT_STRATEGY=random

# Site-specific strategy
ENRICH_PROMPT_STRATEGY__my_site=listicle_prompt.txt
ENRICH_PROMPT_STRATEGY__ai_news=analysis_prompt.txt
```

### 2. Publishing Jitter for Organic Automation

Makes automation appear more natural to search engines:

**Topic Count Ranges:**
```bash
# Fixed count (original behavior)
TOPIC_COUNT=5

# Random count within range (new)
TOPIC_COUNT=3-7
```

**Timing Jitter:**
- Random 0-180 second delay at pipeline start
- Makes scheduled runs appear more human-like
- Can be disabled for testing with `--no-jitter` flag

### 3. Cost and Quality Metrics

Enhanced logging with metadata tracking:

```jsonl
{
  "stage": "wordpress_publish",
  "ok": true,
  "drafts_created": 5,
  "total_input_tokens": 0,
  "total_output_tokens": 0,  
  "estimated_cost": 0.0,
  "prompts_used": ["listicle_prompt.txt", "analysis_prompt.txt", "template-based"],
  "prompt_strategy": "random"
}
```

**Metadata Fields:**
- `prompt_used` - Which prompt template was used
- `llm_model` - Model identifier (future LLM integration)
- `input_tokens` - Input token count (0 for templates)
- `output_tokens` - Output token count (0 for templates)
- `estimated_cost` - Cost estimation (0.0 for templates)

## Content Enhancement

### Current Implementation
The enrichment system generates structured blog posts with:

- **Multiple Content Formats** - 5 different prompt templates for variety
- **Smart Topic Extraction** - Context-aware content generation
- **Metadata Tracking** - Cost and quality metrics for future LLM integration
- **Backward Compatibility** - Existing functionality preserved

### Future LLM Integration
The system is designed for easy enhancement:

```python
# Current: Multi-prompt template generation
result = generate_post(topic, 'random')
post_data = result['post_data']
metadata = result['metadata']

# Future: LLM-powered generation (same interface)
result = generate_post_with_llm(topic, model="gpt-4", strategy="analysis")
post_data = result['post_data']  # Same structure
metadata = result['metadata']   # Real token counts and costs

# Future: SEO-optimized content
result = generate_seo_optimized_content(topic, keywords=["AI", "automation"])
```

## Troubleshooting

### Common Issues

**Pipeline fails with "Site not found"**
- Verify site exists in Orion and has categories
- Check `--site-key` matches exactly

**WordPress publishing in dry-run when credentials are set**
- Verify environment variable names (underscores vs hyphens)
- Check credentials are valid with WordPress API test

**Topics not being created**
- Check site has categories configured
- Verify week creation is working
- Look for API authentication issues

### Debug Commands

```bash
# Test API connectivity
make test-api

# Test WordPress connection
cd python && PYTHONPATH=. python -c "
from orion.publish.publisher_wp import WordPressPublisher
wp = WordPressPublisher()
print(f'WP configured: {wp.config.has_wordpress_config}')
"

# Run pipeline with verbose logging
export ORION_LOGGING_LEVEL=DEBUG
make automate SITE=my-site COUNT=1
```

### Log Analysis

```bash
# View recent logs
cat python/automation-logs/my-site/$(date +%Y-%m-%d).jsonl

# Check for errors
grep '"ok":false' python/automation-logs/my-site/*.jsonl

# Count successful runs
grep '"stage":"wordpress_publish"' python/automation-logs/my-site/*.jsonl | wc -l
```

## GitHub Actions Configuration

### Setting Up Secrets

1. Go to your repository **Settings → Secrets and variables → Actions**
2. Add the required secrets listed above
3. Test with manual workflow dispatch before enabling cron

### Customizing Schedule

Edit `.github/workflows/publish-cron.yml`:

```yaml
on:
  schedule:
    # Run twice daily (6 AM and 4 PM UTC)  
    - cron: "5 6,16 * * *"
    # Run every 4 hours
    # - cron: "0 */4 * * *"
    # Run weekdays only at 9 AM UTC
    # - cron: "0 9 * * 1-5"
```

### Manual Workflow Triggers

The workflow supports manual triggers with parameters:

- **Sites**: Override `ORION_SITES` for specific runs
- **Topic Count**: Override `TOPIC_COUNT` per site
- **Dry Run**: Force dry-run mode across all sites

## Makefile Targets

Convenient commands for local development:

```bash
# Run automation for specific site
make automate SITE=my-site COUNT=5

# Test without publishing
make automate-dry SITE=my-site COUNT=3

# Validate configuration
make validate-config

# Run automation tests
make test-automation
```

## API Integration

The automation system integrates seamlessly with existing Orion APIs:

### Orion API Endpoints Used
- `GET /api/health` - Health checking
- `GET /api/sites` - Site and category data
- `GET/POST /api/weeks` - Week management
- `POST /api/weeks/[id]/topics` - Bulk topic creation
- `POST /api/jobrun` - Optional job tracking

### WordPress API Endpoints Used
- `POST /wp-json/wp/v2/posts` - Draft creation
- `GET /wp-json/wp/v2/posts` - Recent posts (validation)

No server-side changes required - all new functionality is additive under `python/`.

## Development and Testing

### Running Tests

```bash
# Run all automation tests
make test-automation

# Run all tests (Phase 3 + Phase 4)
make test

# Integration testing
make test-multisite
```

### Adding New Sites

1. Add site to Orion admin interface with categories
2. Add site key to `ORION_SITES` environment variable
3. Optionally add site-specific WordPress credentials
4. Test with manual pipeline run
5. Monitor automation logs for the new site

### Extending Content Generation

To enhance content generation:

1. Modify `python/orion/automate/enrich.py`
2. Keep the `generate_post(topic) -> dict` interface unchanged
3. Add new functions like `generate_post_with_llm()`
4. Update tests in `test_automate_pipeline.py`

The system is designed for easy extension without breaking existing functionality.

---

## Support

For issues with Phase 4 automation:

1. Check automation logs in GitHub Actions artifacts
2. Verify configuration with validation commands
3. Test individual components (API, WordPress, topics)
4. Review this documentation for troubleshooting steps

The automation system builds on the solid foundation of Phase 3, ensuring reliability and maintainability.
