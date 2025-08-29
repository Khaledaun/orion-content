

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
