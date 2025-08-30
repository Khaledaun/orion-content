

# Orion Phase 5: Multi-Site Automation - Installation Guide

This ZIP contains the complete Phase 5 enhancement for multi-site automation support in the Orion Content Management System.

## What's New in Phase 5

- ✅ **Enhanced Multi-Site Configuration** with per-site environment variables
- ✅ **Multiple Execution Modes**: Parallel, sequential, and matrix job support
- ✅ **Automatic Site Detection** from environment variables
- ✅ **Advanced Topic Management** with count ranges (e.g., "3-7")
- ✅ **Flexible Content Strategies** per site
- ✅ **Matrix Job GitHub Actions** for maximum parallelization
- ✅ **Comprehensive Testing** with 17 new test cases
- ✅ **Detailed Documentation** and troubleshooting guides

## Quick Installation

### Step 1: Extract and Copy Files

```bash
# Extract the ZIP file
unzip orion-phase5-multisite.zip

# Navigate to your existing orion-content directory
cd /path/to/your/orion-content

# Copy all new/updated files
cp -r orion-phase5-multisite/* .

# The copy should update:
# - python/orion/automate/multisite.py (enhanced)
# - python/orion/automate/run_pipeline_multisite.py (new)
# - python/tests/test_multisite_phase5.py (new)
# - docs/PHASE5_MULTISITE.md (new)
# - .github/workflows/automation-multisite.yml (new)
```

### Step 2: Install and Test

```bash
# Run tests to verify everything works
cd python
python -m pytest tests/test_multisite_phase5.py -v

# Validate your current configuration
python -m orion.automate.multisite --validate-all

# Test the new multi-site runner
python -m orion.automate.run_pipeline_multisite --sites my-site --dry-run-wp 1
```

### Step 3: Configure Multi-Site

#### Option A: Use Explicit Site List
```bash
export ORION_SITES="travel,finance,health"
```

#### Option B: Use Auto-Detection (Recommended)
Set site-specific environment variables - sites will be auto-detected:

```bash
# Travel site
export WP_URL__TRAVEL="https://travel.example.com"
export WP_USERNAME__TRAVEL="travel_admin"
export WP_APP_PASSWORD__TRAVEL="travel_secret"
export TOPIC_COUNT__TRAVEL="3-7"
export ENRICH_PROMPT_STRATEGY__TRAVEL="listicle.md"

# Finance site  
export WP_URL__FINANCE="https://finance.example.com"
export WP_USERNAME__FINANCE="finance_admin"
export WP_APP_PASSWORD__FINANCE="finance_secret"
export TOPIC_COUNT__FINANCE="10"
export ENRICH_PROMPT_STRATEGY__FINANCE="random"
```

### Step 4: GitHub Actions Setup

#### Replace or Update Workflow
You can either:
1. **Replace** the existing `.github/workflows/publish-cron.yml` with the new `automation-multisite.yml`
2. **Keep both** workflows (rename the new one if needed)

#### Add GitHub Secrets
For each site, add secrets following the pattern `VARIABLE__SITE_NAME`:

**Example for travel site:**
- `WP_URL__TRAVEL`
- `WP_USERNAME__TRAVEL`  
- `WP_APP_PASSWORD__TRAVEL`
- `TOPIC_COUNT__TRAVEL`
- `ENRICH_PROMPT_STRATEGY__TRAVEL`

## Usage Examples

### Command Line

```bash
# Run all configured sites in parallel
python -m orion.automate.run_pipeline_multisite

# Run specific sites sequentially
python -m orion.automate.run_pipeline_multisite --sites travel,finance --sequential

# List all detected sites
python -m orion.automate.multisite --list-sites

# Validate configuration
python -m orion.automate.multisite --validate-all

# Generate matrix JSON for GitHub Actions
python -m orion.automate.multisite --matrix
```

### GitHub Actions

The new workflow supports three execution modes:

1. **Parallel Mode**: All sites run in one job using ThreadPoolExecutor
2. **Sequential Mode**: Sites run one after another in one job  
3. **Matrix Mode**: Each site runs as a separate GitHub job

Manual trigger options:
- **Sites**: Comma-separated list (auto-detects if empty)
- **Execution Mode**: `parallel`, `sequential`, or `matrix`
- **Topic Count Override**: Override site configurations
- **Dry Run**: Test without WordPress publishing

## File Structure

```
orion-phase5-multisite/
├── python/
│   ├── orion/
│   │   └── automate/
│   │       ├── multisite.py                    # Enhanced configuration
│   │       └── run_pipeline_multisite.py       # New multi-site runner
│   └── tests/
│       └── test_multisite_phase5.py            # New comprehensive tests
├── .github/
│   └── workflows/
│       └── automation-multisite.yml            # New enhanced workflow
├── docs/
│   └── PHASE5_MULTISITE.md                     # Complete documentation
└── README_PHASE5.md                            # This installation guide
```

## Key Features

### Enhanced Site Configuration
- Auto-detection from environment variables
- Per-site WordPress credentials
- Site-specific topic counts with ranges
- Individual content generation strategies

### Advanced Execution Modes
- **Parallel**: Fast execution with resource sharing
- **Sequential**: Reliable execution with easy debugging  
- **Matrix**: Maximum parallelization with isolation

### Robust Validation
- WordPress URL and credential validation
- Topic count range validation (1-20)
- Content strategy validation
- Comprehensive error reporting

### Comprehensive Logging
- Global multi-site execution logs
- Per-site detailed logs
- GitHub Actions artifacts (30-day retention)
- JSON structured logging for analysis

## Backward Compatibility

Phase 5 is fully backward compatible:

✅ **Existing configurations continue to work unchanged**  
✅ **Single-site pipelines still available**  
✅ **Original workflow can run alongside new workflow**  
✅ **All existing tests pass**  

## Troubleshooting

### Common Issues

**"No sites configured"**
```bash
# Check site detection
python -m orion.automate.multisite --list-sites

# Add explicit site list or site-specific variables
export ORION_SITES="mysite"
# OR
export WP_URL__MYSITE="https://example.com"
```

**Configuration validation errors**
```bash  
# Check specific site
python -m orion.automate.multisite --site-key problematic-site

# Fix common issues:
# - Invalid URLs (must be http:// or https://)
# - Topic counts outside 1-20 range  
# - Invalid prompt strategies
```

**GitHub Actions matrix failures**
```bash
# Ensure secret names match pattern:
# Site: my-travel-blog
# Secret: WP_URL__MY_TRAVEL_BLOG (hyphens → underscores, uppercase)
```

### Debug Commands

```bash
# Test single site pipeline
python -m orion.automate.run_pipeline --site-key mysite --topics 1 --dry-run-wp 1

# Run multi-site in dry-run
python -m orion.automate.run_pipeline_multisite --publish 0

# Check configuration matrix
python -m orion.automate.multisite --matrix | jq .
```

## Support

- **Documentation**: `docs/PHASE5_MULTISITE.md`
- **Tests**: Run `python -m pytest tests/test_multisite_phase5.py -v`
- **Validation**: `python -m orion.automate.multisite --validate-all`

## Migration Checklist

- [ ] Extract and copy Phase 5 files
- [ ] Run tests to verify installation
- [ ] Configure multiple sites (environment variables)
- [ ] Add GitHub secrets for each site
- [ ] Test multi-site runner locally
- [ ] Update or add GitHub Actions workflow
- [ ] Run first automated multi-site pipeline
- [ ] Monitor logs and adjust configurations

---

**Phase 5 is ready for production use!** 

The system can now efficiently manage content generation across multiple WordPress sites with sophisticated orchestration, comprehensive monitoring, and flexible configuration options.

