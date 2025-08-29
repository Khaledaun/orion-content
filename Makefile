ORION_CONSOLE_TOKEN ?= test-token


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




analyzer-demo: ## Run analyzer demonstration

analyzer-demo: ## Run analyzer demonstration

# Phase 6: Strategic Site Analyzer targets  
.PHONY: test-analyzer analyze analyze-all
.PHONY: analyze-my-site analyze-competitor analyze-prospect
.PHONY: analyzer-help analyzer-demo

# Variables for analyzer
SITE_URL ?= https://example.com
COMPETITOR_URL ?= https://competitor.example.com  
PROSPECT_URL ?= https://prospect.example.com
ANALYZER_OUTPUT ?= ./analysis-reports
MAX_PAGES ?= 5
USE_LLM ?= false
VERBOSE ?= false

test-analyzer: ## Run all analyzer tests with validation
	@echo "Running Phase 6 Strategic Site Analyzer tests..."
	cd python && env ORION_CONSOLE_TOKEN="$(ORION_CONSOLE_TOKEN)" \
		python -m pytest -vv --maxfail=1 tests/analyzer/
	@echo "✅ All analyzer tests passed"

analyze: ## Quick analysis (make analyze MODE=my-site URL=https://example.com)
	@if [ -z "$(MODE)" ] || [ -z "$(URL)" ]; then \
		echo "❌ Usage: make analyze MODE=my-site|competitor|prospect URL=https://example.com"; \
		exit 1; \
	fi
	@echo "Running $(MODE) analysis for $(URL)"
	cd python && ORION_CONSOLE_TOKEN="${ORION_CONSOLE_TOKEN:-test-token}" python -m orion.analyzer.run_analyzer \
		$(MODE) $(URL) --max-pages $(MAX_PAGES) \
		$(if $(filter true,$(USE_LLM)),--use-llm,) \
		$(if $(filter true,$(VERBOSE)),--verbose,) \
		--output $(ANALYZER_OUTPUT)

analyzer-help: ## Show analyzer usage examples
	@echo "Phase 6 Strategic Site Analyzer - Usage Examples"  
	@echo "Basic: make analyze MODE=my-site URL=https://yoursite.com"
	@echo "Test:  make test-analyzer"


# Phase 7: Quality Assurance Framework - Makefile Additions
# Add these targets to the main Makefile

# Variables for Phase 7
SITE_ID ?= 
TOPIC_ID ?=
FILE ?=
NOTES ?=

# Phase 7: Quality Framework targets
.PHONY: strategy-get strategy-set rulebook-get rulebook-bump
.PHONY: generate-outline write-sections enrich-eeat check-quality
.PHONY: pipeline-run rulebook-update-dryrun test-phase7

# Site Strategy Management
strategy-get: ## Get site strategy (SITE_ID=site_id_here)
	@if [ -z "$(SITE_ID)" ]; then \
		echo "❌ Usage: make strategy-get SITE_ID=site_id_here"; \
		exit 1; \
	fi
	@echo "Getting strategy for site: $(SITE_ID)"
	$(PYTHON_PATH) python -c "\
	from orion.api_client import client; \
	from orion.config import config; \
	import json; \
	response = client.session.get(f'{config.orion_base_url}/api/sites/$(SITE_ID)/strategy'); \
	response.raise_for_status(); \
	print(json.dumps(response.json(), indent=2))"

strategy-set: ## Set site strategy (SITE_ID=site_id_here FILE=path/to/strategy.json)
	@if [ -z "$(SITE_ID)" ] || [ -z "$(FILE)" ]; then \
		echo "❌ Usage: make strategy-set SITE_ID=site_id_here FILE=path/to/strategy.json"; \
		exit 1; \
	fi
	@echo "Setting strategy for site: $(SITE_ID)"
	$(PYTHON_PATH) python -c "\
	from orion.api_client import client; \
	from orion.config import config; \
	import json; \
	with open('$(FILE)') as f: data = json.load(f); \
	response = client.session.post(f'{config.orion_base_url}/api/sites/$(SITE_ID)/strategy', json=data); \
	response.raise_for_status(); \
	print('✅ Strategy updated successfully')"

# Global Rulebook Management
rulebook-get: ## Get current global rulebook
	@echo "Getting current global rulebook"
	$(PYTHON_PATH) python -c "\
	from orion.api_client import client; \
	from orion.config import config; \
	import json; \
	response = client.session.get(f'{config.orion_base_url}/api/rulebook'); \
	response.raise_for_status(); \
	print(json.dumps(response.json(), indent=2))"

rulebook-bump: ## Create new rulebook version (FILE=path/to/rulebook.json NOTES="version notes")
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Usage: make rulebook-bump FILE=path/to/rulebook.json NOTES='version notes'"; \
		exit 1; \
	fi
	@echo "Creating new rulebook version"
	$(PYTHON_PATH) python -c "\
	from orion.api_client import client; \
	from orion.config import config; \
	import json; \
	with open('$(FILE)') as f: rules = json.load(f); \
	payload = {'rules': rules, 'sources': [], 'notes': '$(NOTES)'}; \
	response = client.session.post(f'{config.orion_base_url}/api/rulebook', json=payload); \
	response.raise_for_status(); \
	result = response.json(); \
	print(f'✅ New rulebook version created: {result.get(\"version\", \"unknown\")}')"

# Pipeline Stage Testing
generate-outline: ## Generate outline for topic (TOPIC_ID=topic_id_here)
	@if [ -z "$(TOPIC_ID)" ]; then \
		echo "❌ Usage: make generate-outline TOPIC_ID=topic_id_here"; \
		exit 1; \
	fi
	@echo "Generating outline for topic: $(TOPIC_ID)"
	$(PYTHON_PATH) python -c "\
	from orion.enrich import generate_outline; \
	from orion.api_client import client; \
	from orion.config import config; \
	import json; \
	topic_resp = client.session.get(f'{config.orion_base_url}/api/topics/$(TOPIC_ID)'); \
	if topic_resp.status_code != 200: topic_data = {'title': 'Test Topic', 'angle': 'Test angle'}; \
	else: topic_data = topic_resp.json(); \
	outline = generate_outline(topic_data, {}, {}); \
	print(json.dumps(outline, indent=2))"

write-sections: ## Write sections for topic (TOPIC_ID=topic_id_here)  
	@if [ -z "$(TOPIC_ID)" ]; then \
		echo "❌ Usage: make write-sections TOPIC_ID=topic_id_here"; \
		exit 1; \
	fi
	@echo "Writing sections for topic: $(TOPIC_ID)"
	$(PYTHON_PATH) python -c "\
	from orion.enrich import generate_outline, write_sections; \
	topic_data = {'title': 'Test Topic', 'angle': 'Test angle'}; \
	outline = generate_outline(topic_data, {}, {}); \
	sections = write_sections(outline, {}, {}); \
	import json; print(json.dumps(sections, indent=2))"

enrich-eeat: ## Apply E-E-A-T enrichment for topic (TOPIC_ID=topic_id_here)
	@if [ -z "$(TOPIC_ID)" ]; then \
		echo "❌ Usage: make enrich-eeat TOPIC_ID=topic_id_here"; \
		exit 1; \
	fi
	@echo "Applying E-E-A-T enrichment for topic: $(TOPIC_ID)"
	$(PYTHON_PATH) python -c "\
	from orion.enrich import generate_outline, write_sections, enrich_for_eeat; \
	topic_data = {'title': 'Test Topic', 'angle': 'Test angle'}; \
	outline = generate_outline(topic_data, {}, {}); \
	sections = write_sections(outline, {}, {}); \
	enriched = enrich_for_eeat(sections, {}, {}); \
	import json; print(json.dumps(enriched, indent=2))"

check-quality: ## Check content quality (FILE=path/to/article.md)
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Usage: make check-quality FILE=path/to/article.md"; \
		exit 1; \
	fi
	@echo "Checking quality for: $(FILE)"
	$(PYTHON_PATH) python -c "\
	from orion.quality.checker import check_quality; \
	import json; \
	with open('$(FILE)') as f: content = f.read(); \
	result = check_quality(content, {'title': 'Test Article'}, 'test keyword', {}, {}); \
	print(json.dumps(result, indent=2))"

# Full Pipeline Execution
pipeline-run: ## Run complete pipeline (SITE_ID=site_id TOPIC_ID=topic_id)
	@if [ -z "$(SITE_ID)" ] || [ -z "$(TOPIC_ID)" ]; then \
		echo "❌ Usage: make pipeline-run SITE_ID=site_id TOPIC_ID=topic_id"; \
		exit 1; \
	fi
	@echo "Running Phase 7 pipeline for site $(SITE_ID), topic $(TOPIC_ID)"
	$(PYTHON_PATH) python -m orion.pipeline.run_pipeline \
		--site-key $(SITE_ID) \
		--topic-id $(TOPIC_ID) \
		--publish 1

# Rulebook Research and Updates
rulebook-update-dryrun: ## Run rulebook update in dry-run mode
	@echo "Running rulebook update (dry-run mode)"
	$(PYTHON_PATH) python -c "\
	from orion.research.update_rulebook import rulebook_updater; \
	from orion.research.perplexity_client import perplexity_client; \
	import json; \
	print('🔍 Fetching research updates...'); \
	research = perplexity_client.fetch_rulebook_updates(); \
	print('📝 Generating update...'); \
	current_rules = {'eeat': {'require_citations': True}, 'seo': {'internal_links_min': 2}}; \
	update = rulebook_updater.update_rulebook(current_rules); \
	print('✅ Dry-run completed'); \
	print('Updated rules:'); \
	print(json.dumps(update['rules'], indent=2)[:500] + '...'); \
	print(f'Version notes: {update.get(\"version_notes\", \"No notes\")}')"

# Phase 7 Testing
test-phase7: ## Run all Phase 7 tests
	@echo "Running Phase 7 Quality Framework tests..."
	cd python && python -m pytest tests/ -v -k "phase7 or quality or rulebook or strategy"
	@echo "✅ Phase 7 tests completed"

test-quality-checker: ## Test quality checker specifically
	@echo "Testing quality checker..."
	$(PYTHON_PATH) python -c "\
	from orion.quality.checker import check_quality; \
	test_content = '<h1>Test Article</h1><p>This is a test article with some test content about test keyword.</p>'; \
	result = check_quality(test_content, {'title': 'Test Article'}, 'test keyword', {}, {}); \
	print(f'✅ Quality check completed'); \
	print(f'Score: {result[\"score\"]}'); \
	print(f'Issues: {len(result[\"issues\"])}'); \
	print(f'Passed: {result[\"enforcement\"][\"passed\"]}')"

test-pipeline-stages: ## Test all pipeline stages
	@echo "Testing Phase 7 pipeline stages..."
	@make generate-outline TOPIC_ID=test-topic
	@echo ""
	@make write-sections TOPIC_ID=test-topic  
	@echo ""
	@make enrich-eeat TOPIC_ID=test-topic
	@echo "✅ All pipeline stages tested"

# Environment and Configuration
check-phase7-env: ## Check Phase 7 environment configuration
	@echo "Checking Phase 7 environment configuration..."
	@echo "ORION_BASE_URL: $${ORION_BASE_URL:-❌ Not set}"
	@echo "ORION_CONSOLE_TOKEN: $${ORION_CONSOLE_TOKEN:+✅ Set}$${ORION_CONSOLE_TOKEN:-❌ Not set}"
	@echo "ORIGINALITY_PROVIDER: $${ORIGINALITY_PROVIDER:-placeholder (default)}"  
	@echo "PERPLEXITY_ENABLED: $${PERPLEXITY_ENABLED:-false (default)}"
	@echo "PERPLEXITY_API_KEY: $${PERPLEXITY_API_KEY:+✅ Set}$${PERPLEXITY_API_KEY:-❌ Not set}"
	@echo "RULEBOOK_ENFORCEMENT_ENABLED: $${RULEBOOK_ENFORCEMENT_ENABLED:-true (default)}"

setup-phase7-demo: ## Set up Phase 7 demo data
	@echo "Setting up Phase 7 demo data..."
	$(PYTHON_PATH) python -c "\
	import json; \
	strategy = { \
		'site_persona': 'Expert technology blog focused on practical solutions', \
		'target_audience': 'Software developers and IT professionals', \
		'eeat_guidelines': { \
			'author_bio_template': 'Written by our expert tech team with 10+ years experience', \
			'preferred_sources': ['github.com', 'stackoverflow.com', 'developer.mozilla.org'], \
			'tone_of_voice': ['professional', 'helpful', 'authoritative'] \
		} \
	}; \
	with open('demo_strategy.json', 'w') as f: json.dump(strategy, f, indent=2); \
	print('✅ Demo strategy created: demo_strategy.json'); \
	print('Use: make strategy-set SITE_ID=your_site_id FILE=demo_strategy.json')"

# Help for Phase 7
phase7-help: ## Show Phase 7 specific help
	@echo "Phase 7: Quality Assurance Framework - Available Commands"
	@echo ""
	@echo "Site Strategy Management:"
	@echo "  strategy-get        Get site strategy (SITE_ID=site_id)"
	@echo "  strategy-set        Set site strategy (SITE_ID=site_id FILE=strategy.json)"
	@echo ""
	@echo "Global Rulebook Management:"
	@echo "  rulebook-get        Get current global rulebook"
	@echo "  rulebook-bump       Create new rulebook version (FILE=rulebook.json NOTES='notes')"
	@echo ""
	@echo "Pipeline Stage Testing:"
	@echo "  generate-outline    Generate outline for topic (TOPIC_ID=topic_id)"
	@echo "  write-sections      Write sections for topic (TOPIC_ID=topic_id)"
	@echo "  enrich-eeat         Apply E-E-A-T enrichment (TOPIC_ID=topic_id)"
	@echo "  check-quality       Check content quality (FILE=article.md)"
	@echo ""
	@echo "Pipeline Execution:"
	@echo "  pipeline-run        Run complete Phase 7 pipeline (SITE_ID=site_id TOPIC_ID=topic_id)"
	@echo ""
	@echo "Research & Updates:"
	@echo "  rulebook-update-dryrun  Test rulebook research and update process"
	@echo ""
	@echo "Testing:"
	@echo "  test-phase7         Run all Phase 7 tests"
	@echo "  test-quality-checker Test quality checker module"
	@echo "  test-pipeline-stages Test all pipeline stages"
	@echo ""
	@echo "Setup & Configuration:"
	@echo "  check-phase7-env    Check Phase 7 environment variables"
	@echo "  setup-phase7-demo   Create demo configuration files"
