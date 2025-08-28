
"""WordPress publisher CLI for creating drafts."""

import argparse
import logging
import base64
from typing import Optional, List, Dict, Any
import requests

from ..config import config

logger = logging.getLogger(__name__)


class WordPressPublisher:
    """WordPress REST API client for creating posts."""
    
    def __init__(self):
        self.config = config
        self.session = requests.Session()
        self.session.timeout = 30
        
        # Set up Basic Auth if WordPress config is available
        if self.config.has_wordpress_config:
            auth_string = f"{self.config.wp_username}:{self.config.wp_app_password}"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            
            self.session.headers.update({
                'Authorization': f'Basic {auth_b64}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            })
    
    def create_post(self, title: str, content: str, status: str = 'draft', 
                   categories: Optional[List[str]] = None) -> Dict[str, Any]:
        """Create a WordPress post."""
        
        if not self.config.has_wordpress_config:
            # Dry run mode
            payload = {
                'title': title,
                'content': content,
                'status': status,
                'categories': categories or []
            }
            
            logger.info("DRY RUN - WordPress not configured")
            logger.info(f"Would create post with payload:")
            logger.info(f"  Title: {title}")
            logger.info(f"  Status: {status}")
            logger.info(f"  Content length: {len(content)} chars")
            logger.info(f"  Categories: {categories or []}")
            
            return {
                'id': 'dry-run',
                'link': 'https://example.com/dry-run-post',
                'status': status,
                'title': {'rendered': title}
            }
        
        # Real WordPress API call
        url = f"{self.config.wp_base_url}/wp-json/wp/v2/posts"
        
        payload = {
            'title': title,
            'content': content,
            'status': status
        }
        
        # Handle categories if provided (would need category ID mapping)
        if categories:
            # For now, just log categories - real implementation would need
            # to map category names to WordPress category IDs
            logger.info(f"Categories requested: {categories} (ID mapping not implemented)")
        
        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Successfully created WordPress post: {result.get('id')}")
            return result
            
        except requests.exceptions.HTTPError as e:
            error_body = None
            try:
                error_body = response.text
            except:
                pass
            
            logger.error(f"WordPress API error: {e}")
            if error_body:
                logger.error(f"Response: {error_body}")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error connecting to WordPress: {e}")
            raise
    
    def list_recent_posts(self, limit: int = 10, status: str = 'draft') -> List[Dict[str, Any]]:
        """List recent WordPress posts."""
        
        if not self.config.has_wordpress_config:
            logger.info("DRY RUN - WordPress not configured")
            logger.info(f"Would list {limit} recent {status} posts")
            return []
        
        url = f"{self.config.wp_base_url}/wp-json/wp/v2/posts"
        params = {
            'per_page': limit,
            'status': status,
            'orderby': 'date',
            'order': 'desc'
        }
        
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching WordPress posts: {e}")
            raise


def main():
    """Main entry point for WordPress publisher CLI."""
    parser = argparse.ArgumentParser(description='Create WordPress drafts')
    parser.add_argument('--title', required=True, help='Post title')
    parser.add_argument('--content', required=True, help='Post content (HTML allowed)')
    parser.add_argument('--status', default='draft', choices=['draft', 'publish'], 
                       help='Post status (default: draft)')
    parser.add_argument('--categories', help='Comma-separated category names')
    
    args = parser.parse_args()
    
    try:
        # Parse categories
        categories = None
        if args.categories:
            categories = [cat.strip() for cat in args.categories.split(',')]
        
        # Create publisher
        publisher = WordPressPublisher()
        
        # Create post
        result = publisher.create_post(
            title=args.title,
            content=args.content,
            status=args.status,
            categories=categories
        )
        
        # Output result as JSON
        import json
        print(json.dumps(result, indent=2))
        
        return 0
        
    except Exception as e:
        logger.error(f"Error creating post: {e}")
        return 1


if __name__ == '__main__':
    exit(main())
