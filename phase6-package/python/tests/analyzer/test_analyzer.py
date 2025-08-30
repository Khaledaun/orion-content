
"""
Tests for Strategic Site Analyzer
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import aiohttp

from orion.analyzer.analyzer import SiteAnalyzer
from orion.config import Config as OrionConfig


class TestSiteAnalyzer:
    """Test cases for SiteAnalyzer class."""
    
    @pytest.fixture
    def config(self):
        """Mock OrionConfig for testing."""
        config = Mock(spec=OrionConfig)
        config.api_url = "http://localhost:8000"
        config.api_key = "test_key"
        return config
    
    @pytest.fixture
    def analyzer(self, config):
        """SiteAnalyzer instance for testing."""
        with patch('orion.analyzer.analyzer.OrionAPIClient'):
            return SiteAnalyzer(config)
    
    @pytest.mark.asyncio
    async def test_analyze_my_site_mode(self, analyzer):
        """Test my-site analysis mode."""
        with patch.object(analyzer, '_analyze_my_site', new_callable=AsyncMock) as mock_analyze:
            mock_analyze.return_value = {
                'mode': 'my-site',
                'target_url': 'https://example.com',
                'analysis': {'seo_analysis': {'title_seo_score': 8.5}}
            }
            
            result = await analyzer.analyze('my-site', 'https://example.com')
            
            assert result['mode'] == 'my-site'
            assert result['target_url'] == 'https://example.com'
            mock_analyze.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_competitor_mode(self, analyzer):
        """Test competitor analysis mode."""
        with patch.object(analyzer, '_analyze_competitor', new_callable=AsyncMock) as mock_analyze:
            mock_analyze.return_value = {
                'mode': 'competitor',
                'target_url': 'https://competitor.com',
                'analysis': {'content_strategy': {'content_quality_score': 7.5}}
            }
            
            result = await analyzer.analyze('competitor', 'https://competitor.com')
            
            assert result['mode'] == 'competitor'
            assert result['target_url'] == 'https://competitor.com'
            mock_analyze.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_prospect_mode(self, analyzer):
        """Test prospect analysis mode."""
        with patch.object(analyzer, '_analyze_prospect', new_callable=AsyncMock) as mock_analyze:
            mock_analyze.return_value = {
                'mode': 'prospect',
                'target_url': 'https://prospect.com',
                'analysis': {'authority_metrics': {'estimated_domain_authority': 65}}
            }
            
            result = await analyzer.analyze('prospect', 'https://prospect.com')
            
            assert result['mode'] == 'prospect'
            assert result['target_url'] == 'https://prospect.com'
            mock_analyze.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_invalid_mode(self, analyzer):
        """Test invalid analysis mode raises ValueError."""
        with pytest.raises(ValueError, match="Invalid analysis mode: invalid"):
            await analyzer.analyze('invalid', 'https://example.com')
    
    def test_extract_headings(self, analyzer):
        """Test heading extraction."""
        html_content = '''
        <h1>Main Title</h1>
        <h2>Subtitle</h2>
        <h3>Sub-subtitle</h3>
        <p>Regular content</p>
        <h2>Another Subtitle</h2>
        '''
        
        headings = analyzer._extract_headings(html_content)
        
        assert len(headings) == 4
        assert headings[0]['level'] == 1
        assert headings[0]['text'] == 'Main Title'
        assert headings[1]['level'] == 2
        assert headings[1]['text'] == 'Subtitle'
    
    def test_score_title_seo(self, analyzer):
        """Test title SEO scoring."""
        # Good title
        good_title = "Best Practices for Content Marketing Strategy"
        score = analyzer._score_title_seo(good_title)
        assert score >= 8.0
        
        # Short title
        short_title = "Short"
        score = analyzer._score_title_seo(short_title)
        assert score <= 8.0
        
        # Empty title
        empty_title = ""
        score = analyzer._score_title_seo(empty_title)
        assert score == 0.0
    
    def test_score_meta_seo(self, analyzer):
        """Test meta description SEO scoring."""
        # Good meta description
        good_meta = "Learn the best practices for content marketing strategy including keyword research, content planning, and performance measurement."
        score = analyzer._score_meta_seo(good_meta)
        assert score >= 8.0
        
        # Short meta description
        short_meta = "Short description"
        score = analyzer._score_meta_seo(short_meta)
        assert score <= 8.0
        
        # Empty meta description
        empty_meta = ""
        score = analyzer._score_meta_seo(empty_meta)
        assert score == 0.0
    
    def test_calculate_performance_score(self, analyzer):
        """Test performance score calculation."""
        # Good performance
        score = analyzer._calculate_performance_score(0.5, 100000)  # 0.5s, 100KB
        assert score >= 9.0
        
        # Poor performance
        score = analyzer._calculate_performance_score(5.0, 10000000)  # 5s, 10MB
        assert score < 6.0


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__])
