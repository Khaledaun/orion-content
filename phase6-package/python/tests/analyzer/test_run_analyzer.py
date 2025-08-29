
"""
Tests for Strategic Site Analyzer CLI
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import json
import argparse

from orion.analyzer.run_analyzer import (
    parse_arguments,
    format_pretty_output,
    main
)


class TestAnalyzerCLI:
    """Test cases for analyzer CLI functionality."""
    
    def test_format_pretty_output(self):
        """Test pretty output formatting."""
        results = {
            'mode': 'my-site',
            'target_url': 'https://example.com',
            'timestamp': '2024-01-01T00:00:00',
            'analysis': {
                'seo_analysis': {
                    'title': 'Example Page Title',
                    'title_length': 18,
                    'meta_description_length': 140,
                    'title_seo_score': 8.5
                },
                'performance': {
                    'response_time_seconds': 1.2,
                    'status_code': 200,
                    'content_size_bytes': 15000,
                    'performance_score': 9.0
                },
                'content_audit': {
                    'content_length': 2500,
                    'heading_count': 5,
                    'has_meta_description': True,
                    'has_structured_data': False
                }
            },
            'recommendations': [
                'Consider lengthening your page title',
                'Add structured data markup'
            ]
        }
        
        output = format_pretty_output(results)
        
        assert 'ORION STRATEGIC SITE ANALYZER' in output
        assert 'MY-SITE' in output
        assert 'https://example.com' in output
        assert 'SEO Analysis:' in output
        assert 'Performance Analysis:' in output
        assert 'Content Audit:' in output
        assert 'RECOMMENDATIONS:' in output
        assert '1. Consider lengthening your page title' in output
        assert '2. Add structured data markup' in output
    
    def test_format_pretty_output_minimal(self):
        """Test pretty output formatting with minimal data."""
        results = {
            'mode': 'competitor',
            'target_url': 'https://competitor.com',
            'timestamp': '2024-01-01T00:00:00'
        }
        
        output = format_pretty_output(results)
        
        assert 'COMPETITOR' in output
        assert 'https://competitor.com' in output
        assert '2024-01-01T00:00:00' in output


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__])
