

"""
Tests for Phase 7 Research and Rulebook Update modules.
"""

import pytest
import json
from orion.research.perplexity_client import PerplexityClient, perplexity_client
from orion.research.update_rulebook import RulebookUpdater, rulebook_updater


class TestPerplexityClient:
    """Test Perplexity research client."""
    
    def test_client_initialization(self):
        """Test client initializes correctly."""
        client = PerplexityClient()
        
        # Should initialize with environment defaults
        assert isinstance(client.enabled, bool)
        assert isinstance(client.topics, list)
        assert len(client.topics) > 0
    
    def test_fetch_rulebook_updates_stub_mode(self):
        """Test fetching updates in stub mode."""
        client = PerplexityClient()
        client.enabled = False  # Force stub mode
        
        result = client.fetch_rulebook_updates()
        
        # Verify structure
        assert "research_date" in result
        assert "topics_researched" in result
        assert "insights" in result
        assert "sources" in result
        assert "confidence_score" in result
        assert "research_method" in result
        
        # Verify insights structure
        insights = result["insights"]
        assert "seo" in insights
        assert "eeat" in insights
        assert "aio" in insights
        assert "ai_search_visibility" in insights
        
        # Each section should have updates and new requirements
        for section in insights.values():
            assert "updates" in section
            assert "new_requirements" in section
    
    def test_validate_research_quality_high_confidence(self):
        """Test research validation with high confidence."""
        client = PerplexityClient()
        
        research_data = {
            "confidence_score": 0.9,
            "sources": [
                {"relevance": "high", "title": "Test Source 1"},
                {"relevance": "high", "title": "Test Source 2"}
            ],
            "research_date": "2025-08-29"
        }
        
        validation = client.validate_research_quality(research_data)
        
        assert validation["valid"] is True
        assert validation["confidence"] == 0.9
        assert validation["recommendation"] == "apply"
        assert len(validation["issues"]) == 0
    
    def test_validate_research_quality_low_confidence(self):
        """Test research validation with low confidence."""
        client = PerplexityClient()
        
        research_data = {
            "confidence_score": 0.6,  # Below 0.7 threshold
            "sources": [
                {"relevance": "low", "title": "Test Source 1"}
            ],
            "research_date": "2025-08-29"
        }
        
        validation = client.validate_research_quality(research_data)
        
        assert validation["valid"] is False
        assert len(validation["issues"]) > 0
        
        # Should have confidence and source issues
        confidence_issues = [i for i in validation["issues"] if "confidence" in i["message"].lower()]
        source_issues = [i for i in validation["issues"] if "source" in i["message"].lower()]
        
        assert len(confidence_issues) > 0
        assert len(source_issues) > 0
    
    def test_validate_research_quality_old_data(self):
        """Test validation with old research data."""
        client = PerplexityClient()
        
        research_data = {
            "confidence_score": 0.8,
            "sources": [{"relevance": "high", "title": "Test Source"}],
            "research_date": "2024-01-01"  # Old date
        }
        
        validation = client.validate_research_quality(research_data)
        
        # Should flag old data
        date_issues = [i for i in validation["issues"] if "days old" in i["message"]]
        assert len(date_issues) > 0


class TestRulebookUpdater:
    """Test rulebook updater functionality."""
    
    @pytest.fixture
    def sample_current_rulebook(self):
        """Sample current rulebook."""
        return {
            "seo": {
                "title_length": {"min": 40, "max": 60},
                "meta_description": {"min": 150, "max": 160},
                "internal_links_min": 2
            },
            "eeat": {
                "require_author_bio": True,
                "require_citations": True
            },
            "enforcement": {
                "default_min_quality_score": 75,
                "tag_if_below": "needs-review"
            }
        }
    
    @pytest.fixture
    def sample_research_data(self):
        """Sample research data with updates."""
        return {
            "research_date": "2025-08-29",
            "confidence_score": 0.85,
            "insights": {
                "seo": {
                    "new_requirements": {
                        "title_length": {"min": 45, "max": 65},  # Slightly different range
                        "internal_links_min": 3  # Higher minimum
                    }
                },
                "eeat": {
                    "new_requirements": {
                        "require_social_proof": True,  # New requirement
                        "min_citations_per_1000_words": 2
                    }
                }
            },
            "sources": [
                {"title": "SEO Update 2024", "url": "https://example.com/seo"}
            ]
        }
    
    def test_update_rulebook_conservative_approach(self, sample_current_rulebook, sample_research_data):
        """Test conservative rulebook updates."""
        updater = RulebookUpdater()
        
        result = updater.update_rulebook(sample_current_rulebook)
        
        # Verify structure
        assert "rules" in result
        assert "sources" in result
        assert "research_metadata" in result
        assert "version_notes" in result
        
        # Verify metadata
        metadata = result["research_metadata"]
        assert "research_date" in metadata
        assert "conservative_mode" in metadata
        assert metadata["conservative_mode"] is True
    
    def test_seo_rules_update_conservative(self):
        """Test SEO rules are updated conservatively."""
        updater = RulebookUpdater()
        
        current = {
            "seo": {
                "title_length": {"min": 40, "max": 60},
                "internal_links_min": 2
            }
        }
        
        insights = {
            "seo": {
                "new_requirements": {
                    "title_length": {"min": 45, "max": 55},  # Higher min, lower max
                    "internal_links_min": 3  # Higher minimum
                }
            }
        }
        
        updated = updater._update_seo_rules(current, insights)
        
        # Should take the more restrictive values
        seo_section = updated["seo"]
        assert seo_section["title_length"]["min"] == 45  # Higher minimum
        assert seo_section["title_length"]["max"] == 55  # Lower maximum
        assert seo_section["internal_links_min"] == 3  # Higher minimum
    
    def test_seo_rules_no_relaxation(self):
        """Test that SEO rules are never relaxed."""
        updater = RulebookUpdater()
        
        current = {
            "seo": {
                "title_length": {"min": 50, "max": 60},
                "internal_links_min": 4
            }
        }
        
        insights = {
            "seo": {
                "new_requirements": {
                    "title_length": {"min": 40, "max": 70},  # More relaxed
                    "internal_links_min": 2  # Lower minimum
                }
            }
        }
        
        updated = updater._update_seo_rules(current, insights)
        
        # Should keep current (more restrictive) values
        seo_section = updated["seo"]
        assert seo_section["title_length"]["min"] == 50  # Keep current higher min
        assert seo_section["title_length"]["max"] == 60  # Keep current lower max
        assert seo_section["internal_links_min"] == 4  # Keep current higher min
    
    def test_eeat_rules_additive_only(self):
        """Test that E-E-A-T rules are only additive."""
        updater = RulebookUpdater()
        
        current = {
            "eeat": {
                "require_author_bio": True,
                "require_citations": True
            }
        }
        
        insights = {
            "eeat": {
                "new_requirements": {
                    "require_social_proof": True,  # New requirement
                    "min_citations_per_1000_words": 3,  # New metric
                    "require_author_bio": False  # Attempt to relax (should be ignored)
                }
            }
        }
        
        updated = updater._update_eeat_rules(current, insights)
        
        eeat_section = updated["eeat"]
        assert eeat_section["require_author_bio"] is True  # Should remain True
        assert eeat_section["require_citations"] is True  # Should remain True
        assert eeat_section["require_social_proof"] is True  # New requirement added
        assert eeat_section["min_citations_per_1000_words"] == 3  # New metric added
    
    def test_version_notes_generation(self):
        """Test version notes generation."""
        updater = RulebookUpdater()
        
        old_rulebook = {
            "seo": {"internal_links_min": 2}
        }
        
        new_rulebook = {
            "seo": {"internal_links_min": 3}
        }
        
        notes = updater._generate_version_notes(old_rulebook, new_rulebook)
        
        assert "internal_links_min" in notes
        assert "2" in notes and "3" in notes
    
    def test_rollback_functionality(self):
        """Test rollback to previous version."""
        updater = RulebookUpdater()
        
        versions_data = [
            {
                "version": 1,
                "rules": {"seo": {"internal_links_min": 2}},
                "sources": []
            },
            {
                "version": 2,
                "rules": {"seo": {"internal_links_min": 3}},
                "sources": []
            }
        ]
        
        rollback = updater.create_rollback_version(2, 1, versions_data)
        
        assert "rules" in rollback
        assert "research_metadata" in rollback
        
        # Should restore version 1 rules
        assert rollback["rules"]["seo"]["internal_links_min"] == 2
        
        # Should have rollback metadata
        metadata = rollback["research_metadata"]
        assert metadata["update_method"] == "rollback"
        assert metadata["rollback_from"] == 2
        assert metadata["rollback_to"] == 1


class TestIntegration:
    """Test integration between research client and updater."""
    
    def test_full_research_and_update_flow(self):
        """Test complete research and update flow."""
        # Use stub mode for deterministic testing
        client = PerplexityClient()
        client.enabled = False
        
        updater = RulebookUpdater()
        
        # Get research data
        research = client.fetch_rulebook_updates()
        
        # Validate research
        validation = client.validate_research_quality(research)
        
        # Apply update if valid
        if validation["valid"]:
            current_rulebook = {
                "seo": {"internal_links_min": 2},
                "eeat": {"require_citations": True}
            }
            
            result = updater.update_rulebook(current_rulebook)
            
            assert "rules" in result
            assert "sources" in result
            assert len(result["sources"]) > 0
        
        # Test should complete without errors
        assert True
