
"""CLI tool to generate and post trending topics for the current week."""

import argparse
import logging
from typing import List, Dict, Any, Set
import random
from datetime import date

from .api_client import client, OrionAPIError

logger = logging.getLogger(__name__)

# Topic templates for variety
TOPIC_TEMPLATES = [
    "{category} Trend #{num:02d} — {subject}",
    "{category} Update: {subject}",
    "Latest in {category}: {subject}",
    "{subject} — A {category} Deep Dive",
    "Breaking: {subject} in {category}",
    "{category} Analysis: {subject}",
    "The Future of {subject} in {category}",
    "{subject}: What {category} Leaders Need to Know"
]

# Subject matter for topics (can be expanded)
TECH_SUBJECTS = [
    "AI Transformers", "Edge Computing", "Quantum Algorithms", "Neural Networks",
    "Cloud Architecture", "Blockchain Innovation", "IoT Security", "5G Networks",
    "DevOps Automation", "Serverless Computing", "Machine Learning", "Data Analytics"
]

AI_SUBJECTS = [
    "Large Language Models", "Computer Vision", "Natural Language Processing",
    "Reinforcement Learning", "Generative AI", "AI Ethics", "MLOps", "AutoML",
    "Federated Learning", "AI Safety", "Robotics AI", "Conversational AI"
]

BUSINESS_SUBJECTS = [
    "Digital Transformation", "Remote Work", "Supply Chain", "Customer Experience",
    "Market Trends", "Financial Innovation", "Leadership Strategies", "Sustainability",
    "Data-Driven Decisions", "Innovation Management", "Strategic Planning", "Growth Hacking"
]

SUBJECT_POOLS = {
    "technology": TECH_SUBJECTS,
    "tech": TECH_SUBJECTS,
    "ai": AI_SUBJECTS,
    "artificial intelligence": AI_SUBJECTS,
    "business": BUSINESS_SUBJECTS,
    "finance": BUSINESS_SUBJECTS,
    "marketing": BUSINESS_SUBJECTS,
}


def generate_topic_title(category_name: str, used_titles: Set[str], attempt: int = 0) -> str:
    """Generate a unique topic title for the given category."""
    category_lower = category_name.lower()
    
    # Select subject pool
    subjects = SUBJECT_POOLS.get(category_lower, TECH_SUBJECTS)
    
    # Generate title
    template = random.choice(TOPIC_TEMPLATES)
    subject = random.choice(subjects)
    
    title = template.format(
        category=category_name,
        subject=subject,
        num=random.randint(1, 99)
    )
    
    # Ensure uniqueness
    if title in used_titles and attempt < 10:
        return generate_topic_title(category_name, used_titles, attempt + 1)
    
    return title


def generate_topics_for_site(site: Dict[str, Any], count: int) -> List[Dict[str, Any]]:
    """Generate topics for a site, distributed across categories."""
    categories = site.get('categories', [])
    if not categories:
        logger.warning(f"Site {site['key']} has no categories")
        return []
    
    topics = []
    used_titles = set()
    
    # Distribute topics across categories
    topics_per_category = max(1, count // len(categories))
    remaining = count % len(categories)
    
    for i, category in enumerate(categories):
        # Add extra topic to some categories if there's remainder
        category_count = topics_per_category + (1 if i < remaining else 0)
        
        for _ in range(category_count):
            title = generate_topic_title(category['name'], used_titles)
            used_titles.add(title)
            
            # Generate topic data
            topic = {
                'siteId': site['id'],
                'categoryId': category['id'],
                'title': title,
                'angle': f"Exploring {title.split('—')[0].strip()} from multiple perspectives",
                'score': round(random.uniform(0.3, 0.9), 2),
                'approved': False  # Default to not approved
            }
            
            topics.append(topic)
    
    return topics


def main():
    """Main entry point for gather_trends CLI."""
    parser = argparse.ArgumentParser(description='Generate trending topics for current week')
    parser.add_argument('--site-key', required=True, help='Site key to generate topics for')
    parser.add_argument('--count', type=int, default=30, help='Number of topics to generate')
    parser.add_argument('--start-date', type=str, help='Start date for week (YYYY-MM-DD)')
    parser.add_argument('--dry-run', action='store_true', help='Generate topics but do not post')
    
    args = parser.parse_args()
    
    try:
        # Parse start date if provided
        start_date = None
        if args.start_date:
            start_date = date.fromisoformat(args.start_date)
        
        # Health check
        logger.info("Checking API health...")
        health = client.health_check()
        if not health.get('ok'):
            raise OrionAPIError("API health check failed")
        
        # Get site
        logger.info(f"Finding site: {args.site_key}")
        site = client.get_site_by_key(args.site_key)
        if not site:
            raise OrionAPIError(f"Site not found: {args.site_key}")
        
        logger.info(f"Found site: {site['name']} (ID: {site['id']})")
        
        # Ensure current week exists
        logger.info("Ensuring current week exists...")
        week = client.ensure_week(args.site_key, start_date)
        logger.info(f"Week: {week['isoWeek']} (ID: {week['id']}, Status: {week['status']})")
        
        # Generate topics
        logger.info(f"Generating {args.count} topics...")
        topics = generate_topics_for_site(site, args.count)
        
        if not topics:
            logger.error("No topics generated (site may have no categories)")
            return 1
        
        logger.info(f"Generated {len(topics)} topics across {len(set(t['categoryId'] for t in topics))} categories")
        
        if args.dry_run:
            logger.info("DRY RUN - Topics would be:")
            for i, topic in enumerate(topics[:5]):  # Show first 5
                logger.info(f"  {i+1}. {topic['title']}")
            if len(topics) > 5:
                logger.info(f"  ... and {len(topics) - 5} more")
            return 0
        
        # Post topics
        logger.info("Posting topics to API...")
        result = client.bulk_create_topics(week['id'], topics)
        
        created_count = result.get('count', 0)
        logger.info(f"Successfully created {created_count} topics")
        
        # Show summary
        logger.info("SUMMARY:")
        logger.info(f"  Week ID: {week['id']}")
        logger.info(f"  ISO Week: {week['isoWeek']}")
        logger.info(f"  Topics Created: {created_count}")
        logger.info("  First 5 topics:")
        for i, topic in enumerate(topics[:5]):
            logger.info(f"    {i+1}. {topic['title']}")
        
        return 0
        
    except OrionAPIError as e:
        logger.error(f"API Error: {e}")
        if e.response_body:
            logger.error(f"Response: {e.response_body}")
        return 1
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return 1


if __name__ == '__main__':
    exit(main())
