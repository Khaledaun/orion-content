

"""
Phase 7: Automated Quality Checker

This module provides comprehensive content quality assessment including:
- Readability scoring
- SEO basics validation
- Originality placeholder
- Fact-checking flags
- E-E-A-T compliance
"""

import logging
import re
import json
from typing import Dict, Any, List, Tuple
import math

logger = logging.getLogger(__name__)


class ReadabilityCalculator:
    """Calculate readability metrics."""
    
    @staticmethod
    def flesch_kincaid_grade(text: str) -> float:
        """Calculate Flesch-Kincaid Grade Level."""
        sentences = len(re.findall(r'[.!?]+', text))
        words = len(text.split())
        syllables = ReadabilityCalculator._count_syllables(text)
        
        if sentences == 0 or words == 0:
            return 0.0
        
        avg_sentence_length = words / sentences
        avg_syllables_per_word = syllables / words
        
        grade = 0.39 * avg_sentence_length + 11.8 * avg_syllables_per_word - 15.59
        return max(0.0, round(grade, 1))
    
    @staticmethod
    def flesch_reading_ease(text: str) -> float:
        """Calculate Flesch Reading Ease score."""
        sentences = len(re.findall(r'[.!?]+', text))
        words = len(text.split())
        syllables = ReadabilityCalculator._count_syllables(text)
        
        if sentences == 0 or words == 0:
            return 0.0
        
        avg_sentence_length = words / sentences
        avg_syllables_per_word = syllables / words
        
        score = 206.835 - 1.015 * avg_sentence_length - 84.6 * avg_syllables_per_word
        return round(max(0.0, min(100.0, score)), 1)
    
    @staticmethod
    def _count_syllables(text: str) -> int:
        """Simple syllable counter."""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        words = text.lower().split()
        syllable_count = 0
        
        for word in words:
            # Remove punctuation
            word = re.sub(r'[^a-z]', '', word)
            if not word:
                continue
            
            # Count vowel groups
            vowel_groups = len(re.findall(r'[aeiouy]+', word))
            # Handle silent e
            if word.endswith('e') and vowel_groups > 1:
                vowel_groups -= 1
            # Ensure at least 1 syllable per word
            syllable_count += max(1, vowel_groups)
        
        return syllable_count


class SEOChecker:
    """Check basic SEO compliance."""
    
    @staticmethod
    def check_keyword_placement(text: str, primary_keyword: str) -> Dict[str, bool]:
        """Check if primary keyword appears in key locations."""
        text_lower = text.lower()
        keyword_lower = primary_keyword.lower()
        
        # Extract title (first h1 or strong emphasis)
        title_match = re.search(r'<h1[^>]*>(.*?)</h1>', text, re.IGNORECASE)
        if not title_match:
            title_match = re.search(r'<title[^>]*>(.*?)</title>', text, re.IGNORECASE)
        title_text = title_match.group(1).lower() if title_match else ""
        
        # Extract first paragraph
        first_para_match = re.search(r'<p[^>]*>(.*?)</p>', text, re.IGNORECASE)
        first_para_text = first_para_match.group(1).lower() if first_para_match else ""
        
        return {
            "keyword_in_title": keyword_lower in title_text,
            "keyword_in_h1": keyword_lower in title_text,  # Assuming title is h1
            "keyword_in_first_para": keyword_lower in first_para_text,
            "keyword_in_content": keyword_lower in text_lower
        }
    
    @staticmethod
    def check_meta_description(meta_description: str, rules: Dict[str, int]) -> Dict[str, Any]:
        """Check meta description compliance."""
        length = len(meta_description)
        min_length = rules.get('min', 150)
        max_length = rules.get('max', 160)
        
        return {
            "length": length,
            "within_range": min_length <= length <= max_length,
            "min_required": min_length,
            "max_allowed": max_length
        }
    
    @staticmethod
    def check_images_alt_text(text: str) -> Dict[str, Any]:
        """Check if images have alt text."""
        img_tags = re.findall(r'<img[^>]*>', text, re.IGNORECASE)
        total_images = len(img_tags)
        
        images_with_alt = 0
        for img_tag in img_tags:
            if 'alt=' in img_tag.lower():
                alt_match = re.search(r'alt=["\']([^"\']*)["\']', img_tag, re.IGNORECASE)
                if alt_match and alt_match.group(1).strip():
                    images_with_alt += 1
        
        return {
            "total_images": total_images,
            "images_with_alt": images_with_alt,
            "compliance_rate": images_with_alt / total_images if total_images > 0 else 1.0
        }


class OriginalityChecker:
    """Placeholder for originality checking."""
    
    @staticmethod
    def check_originality(text: str, provider: str = "placeholder") -> Dict[str, Any]:
        """Check content originality."""
        if provider == "placeholder":
            return {
                "status": "unknown",
                "provider": "placeholder",
                "note": "Originality checking not implemented. Integration point ready for Copyscape or similar service.",
                "similarity_score": None,
                "suspicious_passages": []
            }
        elif provider == "copyscape":
            # TODO: Integrate with Copyscape API
            return {
                "status": "unknown",
                "provider": "copyscape",
                "note": "Copyscape integration not yet implemented",
                "similarity_score": None,
                "suspicious_passages": []
            }
        else:
            return {
                "status": "unknown",
                "provider": "unknown",
                "note": f"Unsupported provider: {provider}",
                "similarity_score": None,
                "suspicious_passages": []
            }


class FactChecker:
    """Extract and flag claims for human review."""
    
    @staticmethod
    def extract_claims(text: str) -> List[Dict[str, Any]]:
        """Extract numerical claims and statistics for review."""
        claims = []
        
        # Remove HTML tags for analysis
        clean_text = re.sub(r'<[^>]+>', '', text)
        
        # Find percentage claims
        percentage_pattern = r'\b(\d+(?:\.\d+)?)\s*%'
        for match in re.finditer(percentage_pattern, clean_text):
            claims.append({
                "claim": match.group(0),
                "type": "percentage",
                "value": float(match.group(1)),
                "context": FactChecker._get_context(clean_text, match.start(), match.end()),
                "needs_review": True
            })
        
        # Find numerical statistics
        stats_pattern = r'\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s+(people|users|customers|studies|reports|cases)'
        for match in re.finditer(stats_pattern, clean_text, re.IGNORECASE):
            claims.append({
                "claim": match.group(0),
                "type": "statistic",
                "value": match.group(1).replace(',', ''),
                "context": FactChecker._get_context(clean_text, match.start(), match.end()),
                "needs_review": True
            })
        
        # Find year references (potential outdated info)
        year_pattern = r'\b(19|20)\d{2}\b'
        for match in re.finditer(year_pattern, clean_text):
            year = int(match.group(0))
            if year < 2020:  # Flag older references
                claims.append({
                    "claim": match.group(0),
                    "type": "date_reference",
                    "value": year,
                    "context": FactChecker._get_context(clean_text, match.start(), match.end()),
                    "needs_review": True,
                    "note": "Potentially outdated reference"
                })
        
        return claims
    
    @staticmethod
    def _get_context(text: str, start: int, end: int, window: int = 50) -> str:
        """Get surrounding context for a claim."""
        context_start = max(0, start - window)
        context_end = min(len(text), end + window)
        return text[context_start:context_end].strip()


def check_quality(article_text: str, metadata: dict, primary_keyword: str, 
                 strategy: dict, rulebook: dict) -> dict:
    """
    Comprehensive quality assessment of content.
    
    Args:
        article_text: The full article content
        metadata: Article metadata (title, description, etc.)
        primary_keyword: Primary SEO keyword
        strategy: SiteStrategy configuration
        rulebook: GlobalRulebook rules
        
    Returns:
        Quality assessment dictionary with score, breakdown, and issues
    """
    logger.info(f"Checking quality for content with keyword: {primary_keyword}")
    
    issues = []
    
    # 1. Readability Assessment
    readability_score = ReadabilityCalculator.flesch_reading_ease(article_text)
    flesch_kincaid = ReadabilityCalculator.flesch_kincaid_grade(article_text)
    
    readability = {
        "flesch_kincaid": flesch_kincaid,
        "flesch_reading_ease": readability_score,
        "grade": "college" if flesch_kincaid > 13 else "high_school" if flesch_kincaid > 9 else "middle_school"
    }
    
    # Flag if too difficult
    if flesch_kincaid > 12:
        issues.append({
            "category": "readability",
            "severity": "medium",
            "message": f"Content may be too complex (Grade Level: {flesch_kincaid})",
            "suggestion": "Consider simplifying sentences and using more common words"
        })
    
    # 2. SEO Basic Checks
    seo_checks = SEOChecker.check_keyword_placement(article_text, primary_keyword)
    
    # Check title length
    title = metadata.get('title', '')
    title_rules = rulebook.get('seo', {}).get('title_length', {})
    if title_rules:
        if len(title) < title_rules.get('min', 0):
            issues.append({
                "category": "seo",
                "severity": "high",
                "message": f"Title too short ({len(title)} chars, min: {title_rules['min']})",
                "suggestion": "Expand title with relevant keywords"
            })
        elif len(title) > title_rules.get('max', 100):
            issues.append({
                "category": "seo",
                "severity": "high",
                "message": f"Title too long ({len(title)} chars, max: {title_rules['max']})",
                "suggestion": "Shorten title while keeping main keyword"
            })
    
    # Check meta description
    meta_desc = metadata.get('meta_description', '')
    meta_rules = rulebook.get('seo', {}).get('meta_description', {})
    meta_check = SEOChecker.check_meta_description(meta_desc, meta_rules)
    
    if not meta_check['within_range']:
        issues.append({
            "category": "seo",
            "severity": "medium",
            "message": f"Meta description length issue ({meta_check['length']} chars)",
            "suggestion": f"Should be between {meta_check['min_required']}-{meta_check['max_allowed']} characters"
        })
    
    # Check keyword placement
    if not seo_checks['keyword_in_title']:
        issues.append({
            "category": "seo",
            "severity": "high",
            "message": "Primary keyword not found in title",
            "suggestion": f"Include '{primary_keyword}' in the title"
        })
    
    if not seo_checks['keyword_in_first_para']:
        issues.append({
            "category": "seo",
            "severity": "medium",
            "message": "Primary keyword not found in first paragraph",
            "suggestion": f"Include '{primary_keyword}' early in the content"
        })
    
    # Check images alt text
    image_check = SEOChecker.check_images_alt_text(article_text)
    if image_check['compliance_rate'] < 1.0:
        issues.append({
            "category": "seo",
            "severity": "medium",
            "message": f"Some images missing alt text ({image_check['images_with_alt']}/{image_check['total_images']})",
            "suggestion": "Add descriptive alt text to all images"
        })
    
    # 3. Originality Check
    originality_provider = strategy.get('originality_provider', 'placeholder')
    originality = OriginalityChecker.check_originality(article_text, originality_provider)
    
    # 4. Fact Extraction
    facts = FactChecker.extract_claims(article_text)
    
    # Flag if many unverified claims
    if len(facts) > 5:
        issues.append({
            "category": "facts",
            "severity": "medium",
            "message": f"{len(facts)} claims detected that may need verification",
            "suggestion": "Review numerical claims and ensure proper citations"
        })
    
    # 5. Calculate Sub-Scores
    
    # E-E-A-T Score (0-100)
    eeat_score = 80  # Base score
    if rulebook.get('eeat', {}).get('require_citations') and not facts:
        eeat_score -= 20  # No citations found
    if not rulebook.get('eeat', {}).get('require_author_bio'):
        eeat_score -= 10  # No author bio
    
    # SEO Score (0-100)
    seo_score = 50  # Base score
    if seo_checks['keyword_in_title']:
        seo_score += 20
    if seo_checks['keyword_in_first_para']:
        seo_score += 15
    if meta_check['within_range']:
        seo_score += 15
    
    # AIO Score (0-100)
    aio_score = 75  # Base score for structured content
    required_sections = rulebook.get('aio', {}).get('content_layout', [])
    if required_sections:
        found_sections = 0
        for section in required_sections:
            if section.lower() in article_text.lower():
                found_sections += 1
        aio_score = int((found_sections / len(required_sections)) * 100)
    
    # AI Search Visibility Score (0-100)
    ai_search_score = 70  # Base score
    if readability_score > 60:  # Good readability
        ai_search_score += 15
    if len(re.findall(r'<h[1-6][^>]*>', article_text)) >= 3:  # Good heading structure
        ai_search_score += 15
    
    # 6. Calculate Weighted Final Score
    score_weights = rulebook.get('score_weights', {
        'eeat': 0.35,
        'seo': 0.30,
        'aio': 0.20,
        'ai_search_visibility': 0.15
    })
    
    final_score = int(
        eeat_score * score_weights.get('eeat', 0.35) +
        seo_score * score_weights.get('seo', 0.30) +
        aio_score * score_weights.get('aio', 0.20) +
        ai_search_score * score_weights.get('ai_search_visibility', 0.15)
    )
    
    # 7. Enforcement Check
    enforcement = rulebook.get('enforcement', {})


class QualityChecker:
    """Main quality checker that orchestrates all quality assessment components."""
    
    def __init__(self):
        self.readability = ReadabilityCalculator()
        self.seo = SEOChecker()
        self.originality = OriginalityChecker()
        self.fact_checker = FactChecker()
        
    def check_quality(self, content, primary_keyword="content", strategy=None, rulebook=None):
        """Comprehensive quality check using all available checkers."""
        
        # Provide defaults
        if strategy is None:
            strategy = {}
        if rulebook is None:
            rulebook = {'enforcement': {'default_min_quality_score': 80}}
            
        # Map content dict to function parameters
        article_text = content.get('body', '')
        metadata = {
            'title': content.get('title', ''),
            'meta_description': content.get('meta_description', ''),
        }
        
        try:
            # Call the existing check_quality function
            result = check_quality(article_text, metadata, primary_keyword, strategy, rulebook)
            
            # Handle None result
            if result is None:
                result = {
                    'total_score': 50,  # Default low score
                    'error': 'check_quality function returned None',
                    'breakdown': {}
                }
            
            # Add component info safely
            if isinstance(result, dict):
                result['components'] = {
                    'readability': 'ReadabilityCalculator',
                    'seo': 'SEOChecker', 
                    'originality': 'OriginalityChecker',
                    'fact_checker': 'FactChecker'
                }
            
            return result
            
        except Exception as e:
            # Return error result if function fails
            return {
                'total_score': 30,  # Very low score for errors
                'error': f'Quality check failed: {str(e)}',
                'breakdown': {},
                'components': {
                    'readability': 'ReadabilityCalculator',
                    'seo': 'SEOChecker', 
                    'originality': 'OriginalityChecker',
                    'fact_checker': 'FactChecker'
                }
            }
