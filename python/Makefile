
.PHONY: venv install test package clean

venv:
	python3 -m venv .venv

install: venv
	. .venv/bin/activate && pip install -r requirements.txt

test: install
	. .venv/bin/activate && ORION_TESTING=1 python -m pytest tests/ -q

package:
	cd .. && zip -r orion-phase3-python.zip python/ docs/ -x "*/__pycache__/*" "*/.venv/*" "*/.pytest_cache/*"

clean:
	rm -rf .venv __pycache__ tests/__pycache__ orion/__pycache__ .pytest_cache
	find . -name "*.pyc" -delete
	find . -name "__pycache__" -type d -exec rm -rf {} +

run-gather:
	. .venv/bin/activate && python -m orion.gather_trends --help

run-publish:
	. .venv/bin/activate && python -m orion.publish.publisher_wp --help

run-audit:
	. .venv/bin/activate && python -m orion.audit.audit_wp --help

smoke-test: install
	@echo "Running smoke tests..."
	@. .venv/bin/activate && ORION_TESTING=1 python -c "from orion.api_client import client; print('✓ API client import OK')"
	@. .venv/bin/activate && ORION_TESTING=1 python -c "from orion.gather_trends import generate_topic_title; print('✓ Gather trends import OK')"
	@. .venv/bin/activate && ORION_TESTING=1 python -c "from orion.publish.publisher_wp import WordPressPublisher; print('✓ WordPress publisher import OK')"
	@. .venv/bin/activate && ORION_TESTING=1 python -c "from orion.audit.audit_wp import format_post_table; print('✓ Audit module import OK')"
	@echo "✓ All imports successful"
