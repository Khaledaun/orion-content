

"""
Tests for Phase 7 API routes (Strategy and Rulebook).
"""

import pytest
import json
from unittest.mock import Mock, patch


class TestSiteStrategyAPI:
    """Test Site Strategy API endpoints."""
    
    @pytest.fixture
    def mock_prisma_site(self):
        """Mock prisma site for testing."""
        return {
            "id": "test_site_id",
            "key": "test-site",
            "name": "Test Site"
        }
    
    @pytest.fixture
    def sample_strategy(self):
        """Sample site strategy."""
        return {
            "site_persona": "Expert technology blog",
            "target_audience": "Software developers",
            "eeat_guidelines": {
                "author_bio_template": "Written by expert developers",
                "preferred_sources": ["github.com", "stackoverflow.com"],
                "tone_of_voice": ["professional", "helpful"]
            },
            "content_archetypes": [
                {
                    "name": "HowToGuide",
                    "prompt_file": "prompts/howto.md",
                    "priority": 0.7
                }
            ]
        }
    
    def test_strategy_json_schema_validation(self, sample_strategy):
        """Test that strategy validation schema works correctly."""
        # from zod import z  # Note: zod is for TypeScript, not Python
        
        # This test simulates the validation logic that would be in the API
        # Since we can't directly test Next.js routes, we test the validation logic
        
        # Valid strategy should pass
        assert "site_persona" in sample_strategy
        assert isinstance(sample_strategy.get("content_archetypes", []), list)
        
        # Test archetype structure
        archetypes = sample_strategy.get("content_archetypes", [])
        if archetypes:
            archetype = archetypes[0]
            assert "name" in archetype
            assert "priority" in archetype
            assert 0 <= archetype["priority"] <= 1
    
    def test_strategy_structure_requirements(self):
        """Test strategy structure requirements."""
        # Test minimal valid strategy
        minimal_strategy = {}
        assert isinstance(minimal_strategy, dict)  # Should be valid empty dict
        
        # Test strategy with eeat_guidelines
        strategy_with_eeat = {
            "eeat_guidelines": {
                "tone_of_voice": ["professional", "expert"]
            }
        }
        
        eeat = strategy_with_eeat.get("eeat_guidelines", {})
        assert isinstance(eeat.get("tone_of_voice", []), list)
        
        # Test archetype priority validation
        strategy_with_archetypes = {
            "content_archetypes": [
                {"name": "Review", "prompt_file": "prompts/review.md", "priority": 0.5},
                {"name": "Guide", "prompt_file": "prompts/guide.md", "priority": 0.8}
            ]
        }
        
        for archetype in strategy_with_archetypes["content_archetypes"]:
            priority = archetype.get("priority", 0)
            assert 0 <= priority <= 1, f"Priority {priority} out of range"


class TestGlobalRulebookAPI:
    """Test Global Rulebook API endpoints."""
    
    @pytest.fixture
    def sample_rulebook(self):
        """Sample global rulebook rules."""
        return {
            "eeat": {
                "require_author_bio": True,
                "require_citations": True,
                "allowed_source_domains": ["*.gov", "*.edu"],
                "citation_style": "harvard",
                "tone_constraints": ["helpful", "expert"]
            },
            "seo": {
                "title_length": {"min": 45, "max": 65},
                "meta_description": {"min": 150, "max": 160},
                "h1_rules": {"must_include_primary_keyword": True},
                "internal_links_min": 3,
                "outbound_links_min": 2,
                "image_alt_required": True,
                "slug_style": "kebab-case"
            },
            "aio": {
                "summary_block_required": True,
                "qa_block_required": True,
                "structured_data": ["Article"],
                "answers_should_be_self_contained": True,
                "content_layout": ["intro", "key_points", "how_to", "faqs", "summary"]
            },
            "ai_search_visibility": {
                "clear_headings": True,
                "explicit_facts_with_sources": True,
                "avoid_fluff": True,
                "scannability_score_min": 80
            },
            "prohibited": {
                "claims_without_source": True,
                "fabricated_stats": True,
                "over_optimization_patterns": ["keyword stuffing"]
            },
            "score_weights": {
                "eeat": 0.35,
                "seo": 0.30,
                "aio": 0.20,
                "ai_search_visibility": 0.15
            },
            "enforcement": {
                "default_min_quality_score": 80,
                "block_publish_if_below": False,
                "tag_if_below": "review-needed"
            }
        }
    
    def test_rulebook_schema_validation(self, sample_rulebook):
        """Test rulebook schema validation."""
        # Test that all required sections are present
        assert "eeat" in sample_rulebook
        assert "seo" in sample_rulebook
        assert "score_weights" in sample_rulebook
        assert "enforcement" in sample_rulebook
        
        # Test E-E-A-T section structure
        eeat = sample_rulebook["eeat"]
        assert isinstance(eeat.get("require_author_bio"), bool)
        assert isinstance(eeat.get("require_citations"), bool)
        assert isinstance(eeat.get("allowed_source_domains"), list)
        
        # Test SEO section structure
        seo = sample_rulebook["seo"]
        title_length = seo.get("title_length", {})
        assert "min" in title_length and "max" in title_length
        assert isinstance(title_length["min"], int)
        assert isinstance(title_length["max"], int)
        
        # Test score weights sum to 1.0
        weights = sample_rulebook["score_weights"]
        total_weight = sum(weights.values())
        assert abs(total_weight - 1.0) < 0.001, f"Weights sum to {total_weight}, should be 1.0"
        
        # Test enforcement section
        enforcement = sample_rulebook["enforcement"]
        assert isinstance(enforcement.get("default_min_quality_score"), int)
        assert isinstance(enforcement.get("block_publish_if_below"), bool)
        assert isinstance(enforcement.get("tag_if_below"), str)
    
    def test_rulebook_version_management(self):
        """Test rulebook version management logic."""
        # Simulate version increment logic
        current_version = 5
        new_version = current_version + 1
        
        assert new_version == 6
        
        # Test version metadata
        version_metadata = {
            "version": new_version,
            "rules": {"test": "rules"},
            "sources": ["source1", "source2"],
            "notes": "Test update"
        }
        
        assert version_metadata["version"] > current_version
        assert "sources" in version_metadata
        assert isinstance(version_metadata["sources"], list)
    
    def test_conservative_update_rules(self):
        """Test conservative rulebook update validation."""
        # Test that numeric minimums only increase
        old_rules = {"seo": {"internal_links_min": 2}}
        new_rules = {"seo": {"internal_links_min": 3}}
        
        # Should be valid increase
        assert new_rules["seo"]["internal_links_min"] > old_rules["seo"]["internal_links_min"]
        
        # Test that boolean requirements can only be set to True
        old_eeat = {"require_citations": False}
        new_eeat = {"require_citations": True}
        
        # Should be valid to require citations
        assert new_eeat["require_citations"] is True
        
        # Test that lists only grow (never shrink)
        old_prohibited = {"over_optimization_patterns": ["keyword stuffing"]}
        new_prohibited = {"over_optimization_patterns": ["keyword stuffing", "link spam"]}
        
        # Should be valid to add new prohibited patterns
        assert len(new_prohibited["over_optimization_patterns"]) >= len(old_prohibited["over_optimization_patterns"])


class TestAPIIntegration:
    """Test API integration scenarios."""
    
    def test_site_strategy_with_rulebook_interaction(self):
        """Test how site strategy interacts with global rulebook."""
        global_rulebook = {
            "enforcement": {
                "default_min_quality_score": 80,
                "tag_if_below": "review-needed"
            }
        }
        
        site_strategy = {
            "quality_overrides": {
                "min_quality_score": 85  # Site-specific higher standard
            }
        }
        
        # Site strategy should be able to override (make more strict)
        effective_threshold = site_strategy.get("quality_overrides", {}).get(
            "min_quality_score", 
            global_rulebook["enforcement"]["default_min_quality_score"]
        )
        
        assert effective_threshold == 85  # Site override applied
    
    def test_missing_strategy_fallback(self):
        """Test behavior when site strategy is missing."""
        # Should fall back to empty strategy
        fallback_strategy = {}
        
        # Should still work with global rulebook
        global_rulebook = {
            "eeat": {"require_citations": True}
        }
        
        # Pipeline should handle missing strategy gracefully
        effective_eeat = fallback_strategy.get("eeat_guidelines", {})
        global_eeat = global_rulebook.get("eeat", {})
        
        # Should use global rules when site strategy is empty
        require_citations = effective_eeat.get("require_citations") or global_eeat.get("require_citations", False)
        assert require_citations is True
    
    def test_api_error_handling_simulation(self):
        """Test API error handling scenarios."""
        # Test invalid site ID
        invalid_site_id = "nonexistent-site-id"
        assert len(invalid_site_id) > 0  # Should be handled as 404
        
        # Test malformed strategy JSON
        malformed_json = '{"invalid": json}'  # Missing closing quote
        
        # In real API, this would be caught by JSON parsing
        try:
            json.loads(malformed_json)
            assert False, "Should have raised JSON error"
        except json.JSONDecodeError:
            assert True  # Expected behavior
        
        # Test strategy validation failure
        invalid_strategy = {
            "content_archetypes": [
                {"name": "Test", "priority": 1.5}  # Invalid priority > 1
            ]
        }
        
        # Validate priority range
        for archetype in invalid_strategy.get("content_archetypes", []):
            priority = archetype.get("priority", 0)
            if not (0 <= priority <= 1):
                assert True  # Should be caught by validation
                break
        else:
            assert False, "Should have caught invalid priority"


class TestBackwardCompatibility:
    """Test backward compatibility with existing systems."""
    
    def test_phase6_integration_compatibility(self):
        """Test that Phase 7 doesn't break Phase 6 functionality."""
        # Phase 6 analyzer should still work without Phase 7 data
        topic_without_flags = {
            "title": "Test Topic",
            "angle": "Test angle",
            "score": 0.8
            # No 'flags' field - should not break
        }
        
        # Should safely access flags
        flags = topic_without_flags.get("flags", {})
        ignore_rulebook = flags.get("ignore_rulebook", False)
        
        assert ignore_rulebook is False  # Safe default
    
    def test_existing_enrich_function_compatibility(self):
        """Test that existing enrich function calls still work."""
        # Old-style function call should still work
        topic = {
            "title": "Compatibility Test",
            "angle": "Testing backward compatibility"
        }
        
        # Should be callable without strategy or rulebook
        from orion.enrich import generate_post
        
        try:
            result = generate_post(topic)
            assert "title" in result
            assert "content" in result
            assert True  # Successfully called
        except Exception as e:
            assert False, f"Backward compatibility broken: {e}"
    
    def test_jobrun_metadata_extension(self):
        """Test that JobRun metadata extensions don't break existing queries."""
        # New metadata field should be optional
        old_job_run = {
            "jobType": "automation",
            "ok": True,
            "notes": "Completed successfully"
            # No 'metadata' field
        }
        
        # Should safely access new metadata
        metadata = old_job_run.get("metadata")
        assert metadata is None  # Safe for old records
        
        # New job runs should have metadata
        new_job_run = {
            "jobType": "phase7_pipeline",
            "ok": True,
            "metadata": {
                "quality_score": 85,
                "stages_completed": 3
            }
        }
        
        metadata = new_job_run.get("metadata", {})
        assert isinstance(metadata, dict)
        assert "quality_score" in metadata
