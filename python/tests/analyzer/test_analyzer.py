"""
Unit tests for the Strategic Site Analyzer.
"""

import json
from pathlib import Path
import pytest
from unittest.mock import AsyncMock, patch
from orion.config import Config
from orion.analyzer.analyzer import SiteAnalyzer


@pytest.fixture
def schema():
    """Load JSON schema for validation."""
    schema_path = Path(__file__).resolve().parents[2] / "orion" / "analyzer" / "schema.json"
    with open(schema_path, "r") as f:
        return json.load(f)


class TestSiteAnalyzer:
    """Test cases for SiteAnalyzer class."""

    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return Config()

    @pytest.fixture  
    def analyzer(self, config):
        """Create SiteAnalyzer instance for testing."""
        return SiteAnalyzer(config)

    @pytest.mark.asyncio
    async def test_analyze_my_site_mode(self, analyzer):
        """Test my-site analysis mode."""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.text.return_value = "<html><head><title>Test Site</title></head><body><h1>Welcome</h1></body></html>"
            mock_response.headers = {"content-type": "text/html"}
            mock_session.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await analyzer.analyze("my-site", "https://example.com")
            
            assert result["mode"] == "my-site"
            assert result["target_url"] == "https://example.com"
            assert "analysis" in result
            assert "recommendations" in result
            assert "summary" in result
            assert "metadata" in result

    @pytest.mark.asyncio
    async def test_analyze_competitor_mode(self, analyzer):
        """Test competitor analysis mode."""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.text.return_value = "<html><head><title>Competitor</title></head><body><h1>Content</h1></body></html>"
            mock_response.headers = {"content-type": "text/html"}
            mock_session.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await analyzer.analyze("competitor", "https://competitor.com")
            
            assert result["mode"] == "competitor"
            assert result["target_url"] == "https://competitor.com"
            assert "analysis" in result
            assert "recommendations" in result

    @pytest.mark.asyncio
    async def test_analyze_prospect_mode(self, analyzer):
        """Test prospect analysis mode."""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.text.return_value = "<html><head><title>Prospect</title></head><body><h1>Business</h1></body></html>"
            mock_response.headers = {"content-type": "text/html"}
            mock_session.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await analyzer.analyze("prospect", "https://prospect.com")
            
            assert result["mode"] == "prospect"
            assert result["target_url"] == "https://prospect.com"
            assert "analysis" in result
            assert "recommendations" in result

    @pytest.mark.asyncio
    async def test_my_site_required_sections(self, analyzer):
        """Test that my-site analysis includes all required sections."""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.text.return_value = "<html><head><title>Test</title></head><body><h1>Test</h1></body></html>"
            mock_response.headers = {"title": "Test"}
            mock_session.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await analyzer._analyze_my_site("https://example.com", {"max_pages": 5, "use_llm": False})
            
            # Check required sections exist
            assert 'seo_audit' in result['analysis']
            assert 'site_blueprint' in result['analysis']
            assert 'linking_opportunities' in result['analysis']
            assert result['analysis']['seo_audit'] is not None
            assert result['analysis']['site_blueprint'] is not None
            assert result['analysis']['linking_opportunities'] is not None

    @pytest.mark.asyncio
    async def test_competitor_required_sections(self, analyzer):
        """Test that competitor analysis includes all required sections."""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.text.return_value = "<html><head><title>Competitor</title></head><body><h1>Content</h1></body></html>"
            mock_response.headers = {"title": "Competitor"}
            mock_session.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await analyzer._analyze_competitor("https://competitor.com", {"max_pages": 5, "use_llm": False})
            
            # Check required sections exist
            assert 'content_strategy' in result['analysis']
            assert 'keyword_strategy' in result['analysis']
            assert 'strategic_opportunities' in result['analysis']
            assert result['analysis']['content_strategy'] is not None
            assert result['analysis']['keyword_strategy'] is not None
            assert result['analysis']['strategic_opportunities'] is not None

    @pytest.mark.asyncio
    async def test_prospect_required_sections(self, analyzer):
        """Test that prospect analysis includes all required sections."""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.text.return_value = "<html><head><title>Prospect</title></head><body><h1>Business</h1></body></html>"
            mock_response.headers = {"title": "Prospect"}
            mock_session.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await analyzer._analyze_prospect("https://prospect.com", {"max_pages": 5, "use_llm": False})
            
            # Check required sections exist
            assert 'missed_opportunities_audit' in result['analysis']
            assert 'proposal' in result['analysis']
            assert 'business_impact_analysis' in result['analysis']
            assert result['analysis']['missed_opportunities_audit'] is not None
            assert result['analysis']['proposal'] is not None
            assert result['analysis']['business_impact_analysis'] is not None

    @pytest.mark.asyncio
    async def test_metadata_consistency(self, analyzer):
        """Test that all analysis modes include required metadata."""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.text.return_value = "<html><head><title>Test</title></head><body><h1>Test</h1></body></html>"
            mock_response.headers = {"title": "Test"}
            mock_session.return_value.__aenter__.return_value.get.return_value = mock_response
            
            for mode in ['my-site', 'competitor', 'prospect']:
                result = await analyzer.analyze(mode, "https://example.com", max_pages=3, use_llm=False)
                
                # Check required metadata fields
                assert 'metadata' in result
                metadata = result['metadata']
                assert 'model' in metadata
                assert 'tokens_used' in metadata
                assert 'latency_ms' in metadata
                assert 'cost_usd' in metadata
                assert isinstance(metadata['latency_ms'], int)
                assert isinstance(metadata['cost_usd'], (int, float))
                assert metadata['latency_ms'] >= 0
                assert metadata['cost_usd'] >= 0

    @pytest.mark.asyncio
    async def test_json_schema_validation(self, analyzer, schema):
        """Test that analyzer output validates against JSON schema."""
        import jsonschema
        
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.text.return_value = "<html><head><title>Test</title></head><body><h1>Test</h1></body></html>"
            mock_response.headers = {"title": "Test"}
            mock_session.return_value.__aenter__.return_value.get.return_value = mock_response
            
            for mode in ['my-site', 'competitor', 'prospect']:
                result = await analyzer.analyze(mode, "https://example.com", max_pages=3, use_llm=False)
                
                # Validate against schema - should not raise exception
                jsonschema.validate(result, schema)
                
                # Additional validation for required fields
                assert result['mode'] == mode
                assert 'target_url' in result
                assert 'timestamp' in result
                assert 'analysis' in result
                assert 'recommendations' in result
                assert 'summary' in result
                assert 'metadata' in result
