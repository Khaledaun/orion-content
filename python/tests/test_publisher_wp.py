
"""Tests for WordPress publisher."""

import pytest
from unittest.mock import Mock, patch
import json

from orion.publish.publisher_wp import WordPressPublisher


class TestWordPressPublisher:
    """Test suite for WordPressPublisher."""
    
    @patch('orion.publish.publisher_wp.config')
    def test_dry_run_when_no_config(self, mock_config):
        """Test dry run mode when WordPress not configured."""
        # Mock config without WordPress settings
        mock_config.has_wordpress_config = False
        
        publisher = WordPressPublisher()
        
        result = publisher.create_post(
            title="Test Post",
            content="Test content",
            status="draft"
        )
        
        assert result['id'] == 'dry-run'
        assert result['status'] == 'draft'
        assert result['title']['rendered'] == 'Test Post'
    
    @patch('orion.publish.publisher_wp.config')
    def test_wordpress_api_call_with_config(self, mock_config):
        """Test actual WordPress API call when configured."""
        # Mock config with WordPress settings
        mock_config.has_wordpress_config = True
        mock_config.wp_base_url = 'https://example.com'
        mock_config.wp_username = 'testuser'
        mock_config.wp_app_password = 'testpass'
        
        publisher = WordPressPublisher()
        
        # Mock the API response
        mock_response = Mock()
        mock_response.json.return_value = {
            'id': 123,
            'link': 'https://example.com/test-post',
            'status': 'draft',
            'title': {'rendered': 'Test Post'}
        }
        mock_response.raise_for_status.return_value = None
        
        publisher.session.post = Mock(return_value=mock_response)
        
        result = publisher.create_post(
            title="Test Post",
            content="Test content",
            status="draft"
        )
        
        assert result['id'] == 123
        assert result['link'] == 'https://example.com/test-post'
        
        # Verify API call was made correctly
        publisher.session.post.assert_called_once()
        call_args = publisher.session.post.call_args
        
        assert call_args[0][0] == 'https://example.com/wp-json/wp/v2/posts'
        
        payload = call_args[1]['json']
        assert payload['title'] == 'Test Post'
        assert payload['content'] == 'Test content'
        assert payload['status'] == 'draft'
    
    @patch('orion.publish.publisher_wp.config')
    def test_basic_auth_header_setup(self, mock_config):
        """Test that Basic Auth header is set up correctly."""
        mock_config.has_wordpress_config = True
        mock_config.wp_username = 'user'
        mock_config.wp_app_password = 'pass'
        
        publisher = WordPressPublisher()
        
        # Check that Authorization header is set
        auth_header = publisher.session.headers.get('Authorization')
        assert auth_header is not None
        assert auth_header.startswith('Basic ')
        
        # Decode and verify the auth string
        import base64
        encoded_auth = auth_header.split(' ')[1]
        decoded_auth = base64.b64decode(encoded_auth).decode('ascii')
        assert decoded_auth == 'user:pass'
    
    @patch('orion.publish.publisher_wp.config')
    def test_list_recent_posts_dry_run(self, mock_config):
        """Test listing posts in dry run mode."""
        mock_config.has_wordpress_config = False
        
        publisher = WordPressPublisher()
        
        result = publisher.list_recent_posts(limit=5, status='draft')
        
        assert result == []
    
    @patch('orion.publish.publisher_wp.config')
    def test_list_recent_posts_with_config(self, mock_config):
        """Test listing posts with WordPress configured."""
        mock_config.has_wordpress_config = True
        mock_config.wp_base_url = 'https://example.com'
        
        publisher = WordPressPublisher()
        
        # Mock API response
        mock_posts = [
            {
                'id': 1,
                'title': {'rendered': 'Post 1'},
                'status': 'draft',
                'date': '2024-01-01T10:00:00'
            },
            {
                'id': 2,
                'title': {'rendered': 'Post 2'},
                'status': 'draft',
                'date': '2024-01-02T10:00:00'
            }
        ]
        
        mock_response = Mock()
        mock_response.json.return_value = mock_posts
        mock_response.raise_for_status.return_value = None
        
        publisher.session.get = Mock(return_value=mock_response)
        
        result = publisher.list_recent_posts(limit=10, status='draft')
        
        assert result == mock_posts
        
        # Verify API call parameters
        call_args = publisher.session.get.call_args
        assert call_args[0][0] == 'https://example.com/wp-json/wp/v2/posts'
        
        params = call_args[1]['params']
        assert params['per_page'] == 10
        assert params['status'] == 'draft'
        assert params['orderby'] == 'date'
        assert params['order'] == 'desc'
    
    def test_create_post_payload_structure(self):
        """Test that create_post generates correct payload structure."""
        # Test dry run to examine payload without making HTTP calls
        with patch('orion.publish.publisher_wp.config') as mock_config:
            mock_config.has_wordpress_config = False
            
            publisher = WordPressPublisher()
            
            result = publisher.create_post(
                title="Test Title",
                content="<p>Test content</p>",
                status="publish",
                categories=["Tech", "AI"]
            )
            
            # In dry run, we can verify the intended payload structure
            assert result['title']['rendered'] == 'Test Title'
            assert result['status'] == 'publish'
    
    @patch('orion.publish.publisher_wp.config')
    def test_network_error_handling(self, mock_config):
        """Test network error handling."""
        mock_config.has_wordpress_config = True
        mock_config.wp_base_url = 'https://example.com'
        
        publisher = WordPressPublisher()
        
        # Mock network error
        import requests
        publisher.session.post = Mock(side_effect=requests.exceptions.ConnectionError("Connection failed"))
        
        with pytest.raises(requests.exceptions.ConnectionError):
            publisher.create_post("Test", "Content")
