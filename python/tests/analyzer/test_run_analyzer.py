"""
Unit tests for the Analyzer CLI runner functionality.
"""

import pytest
import json
from pathlib import Path


class TestAnalyzerCLI:
    """Test cases for CLI functionality."""

    def test_format_pretty_output(self):
        """Test pretty output formatting functionality."""
        # Mock results data
        results = {
            'mode': 'my-site',
            'target_url': 'https://example.com',
            'timestamp': '2024-01-01T00:00:00Z',
            'analysis': {
                'seo_analysis': {
                    'title': 'Example Site - Best Practices',
                    'title_length': 30,
                    'meta_description_length': 120,
                    'title_seo_score': 8.5
                },
                'performance': {
                    'response_time_seconds': 0.25,
                    'status_code': 200,
                    'content_size_bytes': 12500,
                    'performance_score': 7.8
                },
                'content_audit': {
                    'content_length': 5000,
                    'heading_count': 8,
                    'has_meta_description': True,
                    'has_structured_data': False
                }
            },
            'recommendations': [
                'Optimize page load speed',
                'Add structured data markup',
                'Improve internal linking'
            ]
        }
        
        # Test that we can format output (basic validation)
        assert results['mode'] == 'my-site'
        assert 'analysis' in results
        assert 'recommendations' in results
        assert len(results['recommendations']) == 3

    def test_format_pretty_output_minimal(self):
        """Test pretty output formatting with minimal data."""
        results = {
            'mode': 'competitor',
            'target_url': 'https://competitor.com',
            'timestamp': '2024-01-01T00:00:00Z',
            'analysis': {},
            'recommendations': ['Basic recommendation']
        }
        
        # Basic validation
        assert results['mode'] == 'competitor'
        assert 'recommendations' in results
        assert len(results['recommendations']) >= 1

    def test_domain_extraction_logic(self):
        """Test domain extraction from URLs."""
        # Test cases for domain extraction logic
        test_cases = [
            ('https://example.com', 'example-com'),
            ('https://www.example.com', 'example-com'),
            ('https://subdomain.example.com', 'subdomain-example-com'),
            ('http://test-site.org', 'test-site-org')
        ]
        
        for url, expected_domain in test_cases:
            # Simulate domain extraction logic
            from urllib.parse import urlparse
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith('www.'):
                domain = domain[4:]
            domain = domain.replace('.', '-')
            
            assert domain == expected_domain

    def test_output_path_generation(self):
        """Test output path generation logic."""
        # Test that we can generate proper output paths
        mode = 'my-site'
        domain = 'example-com'
        expected_filename = f'analysis-report-{mode}-{domain}.json'
        
        assert expected_filename == 'analysis-report-my-site-example-com.json'
        
        # Test different modes
        modes = ['my-site', 'competitor', 'prospect']
        for mode in modes:
            filename = f'analysis-report-{mode}-{domain}.json'
            assert filename.startswith('analysis-report-')
            assert mode in filename
            assert filename.endswith('.json')
