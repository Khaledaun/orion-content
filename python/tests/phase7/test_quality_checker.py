

"""
Tests for Phase 7 Quality Checker module.
"""

import pytest
import json
from orion.quality.checker import (
    ReadabilityCalculator, SEOChecker, OriginalityChecker, 
    FactChecker, check_quality
)


class TestReadabilityCalculator:
    """Test readability calculations."""
    
    def test_flesch_kincaid_grade_simple(self):
        """Test Flesch-Kincaid grade calculation with simple text."""
        text = "This is a simple test. It has short words. Easy to read."
        grade = ReadabilityCalculator.flesch_kincaid_grade(text)
        assert isinstance(grade, float)
        assert grade >= 0.0
    
    def test_flesch_reading_ease_simple(self):
        """Test Flesch reading ease calculation with simple text."""
        text = "This is a simple test. It has short words. Easy to read."
        ease = ReadabilityCalculator.flesch_reading_ease(text)
        assert isinstance(ease, float)
        assert 0.0 <= ease <= 100.0
    
    def test_empty_text_handling(self):
        """Test handling of empty or invalid text."""
        assert ReadabilityCalculator.flesch_kincaid_grade("") == 0.0
        assert ReadabilityCalculator.flesch_reading_ease("") == 0.0
    
    def test_html_content(self):
        """Test readability calculation with HTML content."""
        html_text = "<h1>Title</h1><p>This is a paragraph with <em>emphasis</em>.</p>"
        grade = ReadabilityCalculator.flesch_kincaid_grade(html_text)
        assert isinstance(grade, float)
        assert grade >= 0.0


class TestSEOChecker:
    """Test SEO checking functionality."""
    
    def test_keyword_placement_detection(self):
        """Test keyword placement detection."""
        content = """
        <h1>Python Programming Guide</h1>
        <p>Python programming is a powerful skill. Learn python programming basics.</p>
        """
        
        result = SEOChecker.check_keyword_placement(content, "python programming")
        
        assert isinstance(result, dict)
        assert "keyword_in_title" in result
        assert "keyword_in_h1" in result
        assert "keyword_in_first_para" in result
        assert "keyword_in_content" in result
        
        assert result["keyword_in_h1"] is True
        assert result["keyword_in_first_para"] is True
    
    def test_meta_description_validation(self):
        """Test meta description length validation."""
        rules = {"min": 150, "max": 160}
        
        # Too short
        short_desc = "Too short"
        result = SEOChecker.check_meta_description(short_desc, rules)
        assert result["within_range"] is False
        assert result["length"] == len(short_desc)
        
        # Just right
        good_desc = "A" * 155
        result = SEOChecker.check_meta_description(good_desc, rules)
        assert result["within_range"] is True
        
        # Too long
        long_desc = "A" * 200
        result = SEOChecker.check_meta_description(long_desc, rules)
        assert result["within_range"] is False
    
    def test_images_alt_text_check(self):
        """Test image alt text checking."""
        html_with_images = """
        <p>Some content</p>
        <img src="image1.jpg" alt="Descriptive alt text">
        <img src="image2.jpg" alt="">
        <img src="image3.jpg">
        """
        
        result = SEOChecker.check_images_alt_text(html_with_images)
        
        assert result["total_images"] == 3
        assert result["images_with_alt"] == 1  # Only first image has meaningful alt
        assert result["compliance_rate"] == 1/3


class TestOriginalityChecker:
    """Test originality checking functionality."""
    
    def test_placeholder_provider(self):
        """Test placeholder originality provider."""
        result = OriginalityChecker.check_originality("Test content", "placeholder")
        
        assert result["status"] == "unknown"
        assert result["provider"] == "placeholder"
        assert "integration point ready" in result["note"].lower()
    
    def test_unsupported_provider(self):
        """Test unsupported provider handling."""
        result = OriginalityChecker.check_originality("Test content", "unknown_provider")
        
        assert result["status"] == "unknown"
        assert "unsupported provider" in result["note"].lower()


class TestFactChecker:
    """Test fact checking functionality."""
    
    def test_percentage_extraction(self):
        """Test extraction of percentage claims."""
        text = "Studies show that 85% of users prefer this approach. Only 12.5% disagree."
        
        claims = FactChecker.extract_claims(text)
        
        percentage_claims = [c for c in claims if c["type"] == "percentage"]
        assert len(percentage_claims) == 2
        
        # Check first percentage
        assert percentage_claims[0]["value"] == 85.0
        assert percentage_claims[0]["needs_review"] is True
    
    def test_statistic_extraction(self):
        """Test extraction of numerical statistics."""
        text = "Over 1,000 users participated in the study. 500 people responded."
        
        claims = FactChecker.extract_claims(text)
        
        stat_claims = [c for c in claims if c["type"] == "statistic"]
        assert len(stat_claims) == 2
    
    def test_date_reference_extraction(self):
        """Test extraction of potentially outdated date references."""
        text = "In 2019, the technology was revolutionary. The 2024 update improved performance."
        
        claims = FactChecker.extract_claims(text)
        
        date_claims = [c for c in claims if c["type"] == "date_reference"]
        outdated_claims = [c for c in date_claims if c.get("note") == "Potentially outdated reference"]
        
        assert len(outdated_claims) == 1  # Only 2019 should be flagged as outdated
    
    def test_context_extraction(self):
        """Test context extraction for claims."""
        text = "The revolutionary study showed that 95% of participants experienced significant improvement."
        
        claims = FactChecker.extract_claims(text)
        
        assert len(claims) > 0
        claim = claims[0]
        assert "context" in claim
        assert "revolutionary" in claim["context"].lower()


class TestQualityChecker:
    """Test the main quality checking function."""
    
    @pytest.fixture
    def sample_content(self):
        """Sample article content for testing."""
        return """
        <h1>Python Programming Best Practices</h1>
        <p>Python programming is essential for modern development. This guide covers python programming basics.</p>
        <h2>Key Concepts</h2>
        <p>Understanding these concepts will improve your python programming skills by 80%.</p>
        <img src="python-guide.jpg" alt="Python programming guide illustration">
        <p>Recent studies from 2019 show significant improvements in developer productivity.</p>
        """
    
    @pytest.fixture
    def sample_metadata(self):
        """Sample article metadata."""
        return {
            "title": "Python Programming Best Practices",
            "meta_description": "Learn python programming best practices with this comprehensive guide that covers essential concepts, tips, and modern techniques for professional developers."
        }
    
    @pytest.fixture
    def sample_strategy(self):
        """Sample site strategy."""
        return {
            "site_persona": "Expert programming blog",
            "target_audience": "Software developers",
            "eeat_guidelines": {
                "author_bio_template": "Written by expert developers",
                "preferred_sources": ["github.com", "python.org"]
            }
        }
    
    @pytest.fixture
    def sample_rulebook(self):
        """Sample global rulebook."""
        return {
            "eeat": {
                "require_author_bio": True,
                "require_citations": True
            },
            "seo": {
                "title_length": {"min": 40, "max": 60},
                "meta_description": {"min": 150, "max": 160},
                "internal_links_min": 2,
                "outbound_links_min": 1,
                "image_alt_required": True
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
    
    def test_quality_check_basic(self, sample_content, sample_metadata, sample_strategy, sample_rulebook):
        """Test basic quality checking functionality."""
        result = check_quality(
            article_text=sample_content,
            metadata=sample_metadata,
            primary_keyword="python programming",
            strategy=sample_strategy,
            rulebook=sample_rulebook
        )
        
        # Verify return structure
        assert "score" in result
        assert "breakdown" in result
        assert "issues" in result
        assert "readability" in result
        assert "seo_checks" in result
        assert "originality" in result
        assert "facts" in result
        assert "enforcement" in result
        
        # Verify score is numeric
        assert isinstance(result["score"], int)
        assert 0 <= result["score"] <= 100
        
        # Verify breakdown has all sections
        breakdown = result["breakdown"]
        assert "eeat" in breakdown
        assert "seo" in breakdown
        assert "aio" in breakdown
        assert "ai_search_visibility" in breakdown
    
    def test_seo_keyword_detection(self, sample_content, sample_metadata, sample_strategy, sample_rulebook):
        """Test SEO keyword detection in quality check."""
        result = check_quality(
            article_text=sample_content,
            metadata=sample_metadata,
            primary_keyword="python programming",
            strategy=sample_strategy,
            rulebook=sample_rulebook
        )
        
        seo_checks = result["seo_checks"]
        assert seo_checks["keyword_in_title"] is True  # Keyword in title
        assert seo_checks["keyword_in_first_para"] is True  # Keyword in first paragraph
    
    def test_meta_description_validation_in_quality_check(self, sample_content, sample_metadata, sample_strategy, sample_rulebook):
        """Test meta description validation within quality check."""
        # Test with good meta description
        result = check_quality(
            article_text=sample_content,
            metadata=sample_metadata,
            primary_keyword="python programming",
            strategy=sample_strategy,
            rulebook=sample_rulebook
        )
        
        # Should not have meta description length issues
        meta_issues = [issue for issue in result["issues"] if "meta description" in issue["message"].lower()]
        assert len(meta_issues) == 0
        
        # Test with bad meta description
        bad_metadata = sample_metadata.copy()
        bad_metadata["meta_description"] = "Too short"
        
        result = check_quality(
            article_text=sample_content,
            metadata=bad_metadata,
            primary_keyword="python programming",
            strategy=sample_strategy,
            rulebook=sample_rulebook
        )
        
        # Should have meta description length issue
        meta_issues = [issue for issue in result["issues"] if "meta description" in issue["message"].lower()]
        assert len(meta_issues) > 0
    
    def test_enforcement_decision(self, sample_content, sample_metadata, sample_strategy, sample_rulebook):
        """Test enforcement decision making."""
        result = check_quality(
            article_text=sample_content,
            metadata=sample_metadata,
            primary_keyword="python programming",
            strategy=sample_strategy,
            rulebook=sample_rulebook
        )
        
        enforcement = result["enforcement"]
        assert "passed" in enforcement
        assert "threshold" in enforcement
        assert isinstance(enforcement["passed"], bool)
        assert enforcement["threshold"] == 80  # From sample rulebook
        
        if not enforcement["passed"]:
            assert enforcement["tag_if_below"] == "review-needed"
    
    def test_fact_extraction_in_quality_check(self, sample_content, sample_metadata, sample_strategy, sample_rulebook):
        """Test fact extraction within quality check."""
        result = check_quality(
            article_text=sample_content,
            metadata=sample_metadata,
            primary_keyword="python programming",
            strategy=sample_strategy,
            rulebook=sample_rulebook
        )
        
        facts = result["facts"]
        assert isinstance(facts, list)
        
        # Should find the 80% claim
        percentage_facts = [f for f in facts if f["type"] == "percentage"]
        assert len(percentage_facts) > 0
        
        # Should find 2023 date reference
        date_facts = [f for f in facts if f["type"] == "date_reference"]
        assert len(date_facts) > 0
    
    def test_readability_scoring(self, sample_content, sample_metadata, sample_strategy, sample_rulebook):
        """Test readability scoring in quality check."""
        result = check_quality(
            article_text=sample_content,
            metadata=sample_metadata,
            primary_keyword="python programming",
            strategy=sample_strategy,
            rulebook=sample_rulebook
        )
        
        readability = result["readability"]
        assert "flesch_kincaid" in readability
        assert "flesch_reading_ease" in readability
        assert "grade" in readability
        
        assert isinstance(readability["flesch_kincaid"], float)
        assert isinstance(readability["flesch_reading_ease"], float)
        assert readability["grade"] in ["college", "high_school", "middle_school"]
