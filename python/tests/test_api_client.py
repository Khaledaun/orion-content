
"""Tests for OrionAPIClient."""

import pytest
from unittest.mock import Mock, patch
from datetime import date
import requests

from orion.api_client import OrionAPIClient, OrionAPIError


class TestOrionAPIClient:
    """Test suite for OrionAPIClient."""
    
    def setup_method(self):
        """Setup test client."""
        with patch('orion.api_client.config') as mock_config:
            mock_config.get_session.return_value = Mock()
            mock_config.orion_base_url = 'http://localhost:3000'
            self.client = OrionAPIClient()
    
    def test_health_check_success(self):
        """Test successful health check."""
        # Mock successful response
        mock_response = Mock()
        mock_response.json.return_value = {'ok': True}
        mock_response.raise_for_status.return_value = None
        
        self.client.session.request.return_value = mock_response
        
        result = self.client.health_check()
        
        assert result == {'ok': True}
        self.client.session.request.assert_called_once_with(
            'GET', 'http://localhost:3000/api/health'
        )
    
    def test_api_error_with_status_code(self):
        """Test API error handling with status code."""
        # Mock HTTP error
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.text = 'Not found'
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError()
        
        self.client.session.request.return_value = mock_response
        
        with pytest.raises(OrionAPIError) as exc_info:
            self.client.health_check()
        
        assert exc_info.value.status_code == 404
        assert exc_info.value.response_body == 'Not found'
    
    def test_get_current_iso_week(self):
        """Test ISO week generation."""
        test_date = date(2024, 1, 15)  # Monday of week 3, 2024
        iso_week = self.client.get_current_iso_week(test_date)
        
        assert iso_week == '2024-W03'
    
    def test_get_site_by_key_found(self):
        """Test finding site by key."""
        mock_sites = [
            {'id': '1', 'key': 'site1', 'name': 'Site 1'},
            {'id': '2', 'key': 'site2', 'name': 'Site 2'}
        ]
        
        mock_response = Mock()
        mock_response.json.return_value = mock_sites
        mock_response.raise_for_status.return_value = None
        
        self.client.session.request.return_value = mock_response
        
        result = self.client.get_site_by_key('site2')
        
        assert result == {'id': '2', 'key': 'site2', 'name': 'Site 2'}
    
    def test_get_site_by_key_not_found(self):
        """Test site not found."""
        mock_response = Mock()
        mock_response.json.return_value = []
        mock_response.raise_for_status.return_value = None
        
        self.client.session.request.return_value = mock_response
        
        result = self.client.get_site_by_key('nonexistent')
        
        assert result is None
    
    def test_bulk_create_topics_validation(self):
        """Test topic validation."""
        invalid_topics = [
            {'siteId': '1', 'title': 'Test'},  # Missing categoryId
            {'categoryId': '2', 'title': 'Test'}  # Missing siteId
        ]
        
        with pytest.raises(ValueError) as exc_info:
            self.client.bulk_create_topics('week1', invalid_topics)
        
        assert 'missing required field' in str(exc_info.value)
    
    def test_bulk_create_topics_success(self):
        """Test successful topic creation."""
        topics = [
            {
                'siteId': '1',
                'categoryId': '2', 
                'title': 'Test Topic',
                'angle': 'Test angle',
                'score': 0.8
            }
        ]
        
        mock_response = Mock()
        mock_response.json.return_value = {'count': 1}
        mock_response.raise_for_status.return_value = None
        
        self.client.session.request.return_value = mock_response
        
        result = self.client.bulk_create_topics('week1', topics)
        
        assert result == {'count': 1}
        
        # Verify correct payload was sent
        call_args = self.client.session.request.call_args
        assert call_args[1]['json'] == {'topics': topics}
    
    def test_headers_present(self):
        """Test that session has required headers."""
        with patch('orion.api_client.config') as mock_config:
            mock_session = Mock()
            mock_config.get_session.return_value = mock_session
            mock_config.orion_base_url = 'http://localhost:3000'
            
            client = OrionAPIClient()
            
            # Verify session is configured
            assert client.session == mock_session
            mock_config.get_session.assert_called_once()
