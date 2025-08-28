
"""WordPress audit CLI for listing recent drafts."""

import argparse
import logging
from typing import List, Dict, Any

from ..publish.publisher_wp import WordPressPublisher

logger = logging.getLogger(__name__)


def format_post_table(posts: List[Dict[str, Any]]) -> str:
    """Format posts as a simple table."""
    if not posts:
        return "No posts found."
    
    # Table headers
    lines = []
    lines.append(f"{'ID':<10} {'Title':<50} {'Status':<10} {'Date':<20}")
    lines.append("-" * 90)
    
    # Table rows
    for post in posts:
        post_id = str(post.get('id', 'N/A'))[:9]
        title = post.get('title', {})
        if isinstance(title, dict):
            title_text = title.get('rendered', 'No title')
        else:
            title_text = str(title)
        
        title_text = title_text[:47] + '...' if len(title_text) > 50 else title_text
        status = post.get('status', 'unknown')
        date_str = post.get('date', 'No date')[:19]  # Truncate datetime
        
        lines.append(f"{post_id:<10} {title_text:<50} {status:<10} {date_str:<20}")
    
    return '\n'.join(lines)


def main():
    """Main entry point for WordPress audit CLI."""
    parser = argparse.ArgumentParser(description='Audit WordPress drafts')
    parser.add_argument('--limit', type=int, default=10, help='Number of posts to show (default: 10)')
    parser.add_argument('--status', default='draft', 
                       choices=['draft', 'publish', 'private', 'any'],
                       help='Post status to filter by (default: draft)')
    
    args = parser.parse_args()
    
    try:
        # Create publisher (reusing for API access)
        publisher = WordPressPublisher()
        
        # Get recent posts
        logger.info(f"Fetching {args.limit} recent {args.status} posts...")
        posts = publisher.list_recent_posts(limit=args.limit, status=args.status)
        
        if not posts:
            if not publisher.config.has_wordpress_config:
                logger.info("WordPress not configured - dry run completed")
            else:
                logger.info("No posts found matching criteria")
            return 0
        
        # Display results
        logger.info(f"Found {len(posts)} posts:")
        print(format_post_table(posts))
        
        return 0
        
    except Exception as e:
        logger.error(f"Error during audit: {e}")
        return 1


if __name__ == '__main__':
    exit(main())
