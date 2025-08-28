
# Orion Content Management System - Makefile
# Provides convenient targets for development, testing, and automation

.PHONY: help install test test-all lint clean dev-server
.PHONY: gather audit publish automate automate-dry validate-config
.PHONY: test-api test-automation package zip-phase4

# Variables
SITE ?= my-site
COUNT ?= 5
TITLE ?= Test Post Title
CONTENT ?= Test post content
PYTHON_PATH = PYTHONPATH=python

# Default target
help:
        @echo "Orion Content Management System - Available Commands"
        @echo ""
        @echo "Development:"
        @echo "  install         Install Python dependencies"
        @echo "  test            Run all tests"
        @echo "  test-api        Test API connectivity"
        @echo "  test-automation Test automation pipeline"
        @echo "  lint            Run code linting"
        @echo "  clean           Clean temporary files"
        @echo "  dev-server      Start development server"
        @echo ""
        @echo "Phase 3 - CLI Tools:"
        @echo "  gather          Generate topics (SITE=my-site COUNT=30)"
        @echo "  audit           Audit WordPress posts"
        @echo "  publish         Create WordPress draft (TITLE='Post Title' CONTENT='Content')"
        @echo ""
        @echo "Phase 4 - Automation:"
        @echo "  automate        Run automation pipeline (SITE=my-site COUNT=5)"
        @echo "  automate-dry    Run automation without WordPress publishing"
        @echo "  validate-config Validate multi-site configuration"
        @echo ""
        @echo "Packaging:"
        @echo "  package         Create distributable ZIP"
        @echo "  zip-phase4      Create Phase 4 ZIP artifact"
        @echo ""
        @echo "Examples:"
        @echo "  make gather SITE=my-site COUNT=10"
        @echo "  make automate SITE=ai-news COUNT=5"
        @echo "  make test-automation"

# Installation and setup
install:
        @echo "Installing Orion dependencies..."
        cd python && python -m pip install --upgrade pip
        cd python && pip install -r requirements.txt
        @echo "✅ Dependencies installed"

# Testing
test:
        @echo "Running all tests..."
        cd python && ORION_TESTING=1 python -m pytest tests/ -v
        @echo "✅ All tests passed"

test-api:
        @echo "Testing API connectivity..."
        cd python && $(PYTHON_PATH) python -c "\
        from orion.api_client import client; \
        print('API Health:', client.health_check()); \
        print('Sites:', len(client.get_sites()))"
        @echo "✅ API test completed"

test-automation:
        @echo "Running automation pipeline tests..."
        cd python && ORION_TESTING=1 python -m pytest tests/test_automate_pipeline.py -v
        @echo "✅ Automation tests passed"

# Development tools
lint:
        @echo "Running code linting..."
        cd python && python -m flake8 orion/ --max-line-length=120 --ignore=E203,W503 || echo "⚠️  Linting warnings found"

clean:
        @echo "Cleaning temporary files..."
        find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
        find . -name "*.pyc" -delete 2>/dev/null || true
        find . -name "*.pyo" -delete 2>/dev/null || true
        rm -rf python/.pytest_cache 2>/dev/null || true
        rm -rf python/automation-logs 2>/dev/null || true
        @echo "✅ Cleanup completed"

dev-server:
        @echo "Starting Orion development server..."
        npm run dev

# Phase 3 CLI Tools
gather:
        @echo "Generating $(COUNT) topics for site: $(SITE)"
        cd python && $(PYTHON_PATH) python -m orion.gather_trends --site-key $(SITE) --count $(COUNT)

gather-dry:
        @echo "Dry run - generating $(COUNT) topics for site: $(SITE)"
        cd python && $(PYTHON_PATH) python -m orion.gather_trends --site-key $(SITE) --count $(COUNT) --dry-run

audit:
        @echo "Auditing WordPress posts..."
        cd python && $(PYTHON_PATH) python -m orion.audit.audit_wp

publish:
        @echo "Creating WordPress draft: $(TITLE)"
        cd python && $(PYTHON_PATH) python -m orion.publish.publisher_wp \
                --title "$(TITLE)" \
                --content "$(CONTENT)" \
                --status draft

# Phase 4 Automation
automate:
        @echo "Running automation pipeline for site: $(SITE) ($(COUNT) topics)"
        cd python && $(PYTHON_PATH) python -m orion.automate.run_pipeline \
                --site-key $(SITE) \
                --topics $(COUNT) \
                --publish 1

automate-dry:
        @echo "Running automation pipeline (dry-run) for site: $(SITE) ($(COUNT) topics)"
        cd python && $(PYTHON_PATH) python -m orion.automate.run_pipeline \
                --site-key $(SITE) \
                --topics $(COUNT) \
                --publish 0

automate-wp-dry:
        @echo "Running automation pipeline (WordPress dry-run) for site: $(SITE) ($(COUNT) topics)"
        cd python && $(PYTHON_PATH) python -m orion.automate.run_pipeline \
                --site-key $(SITE) \
                --topics $(COUNT) \
                --publish 1 \
                --dry-run-wp 1

validate-config:
        @echo "Validating multi-site configuration..."
        cd python && ORION_TESTING=1 $(PYTHON_PATH) python -m orion.automate.multisite
        @echo "✅ Configuration validation completed"

list-sites:
        @echo "Configured sites:"
        cd python && ORION_TESTING=1 $(PYTHON_PATH) python -m orion.automate.multisite --list-sites

# Content generation testing
test-enrich:
        @echo "Testing content enrichment..."
        cd python && ORION_TESTING=1 $(PYTHON_PATH) python -m orion.automate.enrich \
                --title "AI Trend #05 — Machine Learning Revolution" \
                --angle "Exploring how ML is transforming business operations" \
                --score 0.8 \
                --output json

# Packaging and distribution
package:
        @echo "Creating distributable package..."
        @rm -f orion-content.zip
        zip -r orion-content.zip \
                app/ \
                python/ \
                docs/ \
                scripts/ \
                .github/ \
                package.json \
                package-lock.json \
                next.config.js \
                tailwind.config.ts \
                components.json \
                tsconfig.json \
                prisma/ \
                components/ \
                hooks/ \
                lib/ \
                Makefile \
                .env.example \
                -x "*/node_modules/*" "*/.next/*" "*/__pycache__/*" "*.pyc" "*/.venv/*" "*/tsconfig.tsbuildinfo"
        @echo "✅ Package created: orion-content.zip"

zip-phase4:
        @echo "Creating Phase 4 artifact..."
        @rm -f orion-phase4-automation.zip
        cd python && zip -r ../orion-phase4-automation.zip \
                orion/automate/ \
                tests/test_automate_pipeline.py \
                -x "*/__pycache__/*" "*.pyc"
        zip -r orion-phase4-automation.zip \
                .github/workflows/publish-cron.yml \
                docs/PHASE4_AUTOMATION.md \
                Makefile
        @echo "✅ Phase 4 artifact created: orion-phase4-automation.zip"

# Environment setup helpers
check-env:
        @echo "Checking environment variables..."
        @echo "ORION_BASE_URL: $${ORION_BASE_URL:-❌ Not set}"
        @echo "ORION_CONSOLE_TOKEN: $${ORION_CONSOLE_TOKEN:+✅ Set}$${ORION_CONSOLE_TOKEN:-❌ Not set}"
        @echo "WP_BASE_URL: $${WP_BASE_URL:-⚠️ Not set (will run dry-run)}"
        @echo "WP_USERNAME: $${WP_USERNAME:+✅ Set}$${WP_USERNAME:-⚠️ Not set (will run dry-run)}"
        @echo "WP_APP_PASSWORD: $${WP_APP_PASSWORD:+✅ Set}$${WP_APP_PASSWORD:-⚠️ Not set (will run dry-run)}"
        @echo "ORION_SITES: $${ORION_SITES:-my-site (default)}"

# All-in-one targets
setup: install check-env
        @echo "✅ Setup completed"

ci-test: install test test-automation
        @echo "✅ CI testing completed"
