
"""
Multi-site configuration management for Orion automation.

Handles loading site-specific configurations and credentials from either
environment variables or Orion API secrets storage.
"""

import logging
import os
from typing import Dict, List, Optional
from dataclasses import dataclass

from ..config import config

logger = logging.getLogger(__name__)


@dataclass
class SiteConfig:
    """Configuration for a single site."""
    site_key: str
    wp_base_url: Optional[str] = None
    wp_username: Optional[str] = None
    wp_app_password: Optional[str] = None
    topic_count: int = 5
    topic_count_range: tuple = (5, 5)  # (min, max) for jitter support
    enrich_prompt_strategy: str = 'default'
    cron_spec: Optional[str] = None  # For future CI scheduling
    
    @property
    def has_wordpress_config(self) -> bool:
        """Check if WordPress configuration is complete."""
        return all([self.wp_base_url, self.wp_username, self.wp_app_password])
    
    def to_env_dict(self) -> Dict[str, str]:
        """Convert to environment variable dictionary."""
        env_vars = {}
        
        if self.wp_base_url:
            env_vars['WP_BASE_URL'] = self.wp_base_url
        if self.wp_username:
            env_vars['WP_USERNAME'] = self.wp_username
        if self.wp_app_password:
            env_vars['WP_APP_PASSWORD'] = self.wp_app_password
            
        return env_vars


def get_site_list() -> List[str]:
    """Get list of sites to process from environment."""
    sites_env = os.getenv('ORION_SITES', 'my-site')
    return [site.strip() for site in sites_env.split(',') if site.strip()]


def parse_topic_count_range(topic_count_str: str) -> tuple:
    """
    Parse topic count string into (min, max) tuple.
    
    Args:
        topic_count_str: Either "5" or "3-7" format
        
    Returns:
        Tuple of (min_count, max_count)
    """
    try:
        if '-' in topic_count_str:
            # Range format: "3-7"
            min_str, max_str = topic_count_str.split('-', 1)
            min_count = int(min_str.strip())
            max_count = int(max_str.strip())
            
            if min_count > max_count:
                logger.warning(f"Invalid range {topic_count_str}: min > max, swapping values")
                min_count, max_count = max_count, min_count
                
            return (min_count, max_count)
        else:
            # Single number: "5"
            count = int(topic_count_str.strip())
            return (count, count)
    except (ValueError, AttributeError) as e:
        logger.warning(f"Invalid topic count format '{topic_count_str}': {e}, using default (5,5)")
        return (5, 5)


def load_site_config(site_key: str) -> SiteConfig:
    """
    Load configuration for a specific site.
    
    Priority order:
    1. Site-specific environment variables (WP_BASE_URL__<site>, etc.)
    2. Default environment variables (WP_BASE_URL, etc.)  
    3. Orion API secrets (kind="wp:<site-key>") - Future implementation
    4. Fallback to empty config (dry-run mode)
    
    Args:
        site_key: Site identifier
        
    Returns:
        SiteConfig object with resolved configuration
    """
    
    logger.info(f"Loading configuration for site: {site_key}")
    
    # Start with base config
    site_config = SiteConfig(site_key=site_key)
    
    # Normalize site key for environment variables (replace hyphens with underscores)
    env_site_key = site_key.replace('-', '_')
    
    # Try site-specific environment variables first
    site_specific_wp_url = os.getenv(f'WP_BASE_URL__{env_site_key}')
    site_specific_wp_user = os.getenv(f'WP_USERNAME__{env_site_key}')
    site_specific_wp_pass = os.getenv(f'WP_APP_PASSWORD__{env_site_key}')
    
    if site_specific_wp_url and site_specific_wp_user and site_specific_wp_pass:
        logger.info(f"Using site-specific environment variables for {site_key}")
        site_config.wp_base_url = site_specific_wp_url.rstrip('/')
        site_config.wp_username = site_specific_wp_user
        site_config.wp_app_password = site_specific_wp_pass
    else:
        # Fall back to default environment variables
        default_wp_url = os.getenv('WP_BASE_URL')
        default_wp_user = os.getenv('WP_USERNAME')
        default_wp_pass = os.getenv('WP_APP_PASSWORD')
        
        if default_wp_url and default_wp_user and default_wp_pass:
            logger.info(f"Using default environment variables for {site_key}")
            site_config.wp_base_url = default_wp_url.rstrip('/')
            site_config.wp_username = default_wp_user
            site_config.wp_app_password = default_wp_pass
        else:
            logger.info(f"No WordPress credentials found for {site_key} - will run in dry-run mode")
    
    # Load additional configuration
    topic_count_str = os.getenv(f'TOPIC_COUNT__{env_site_key}', os.getenv('TOPIC_COUNT', '5'))
    site_config.topic_count_range = parse_topic_count_range(topic_count_str)
    site_config.topic_count = site_config.topic_count_range[0]  # Backward compatibility
    
    # Load enrichment strategy
    site_config.enrich_prompt_strategy = os.getenv(
        f'ENRICH_PROMPT_STRATEGY__{env_site_key}',
        os.getenv('ENRICH_PROMPT_STRATEGY', 'default')
    )
    
    site_config.cron_spec = os.getenv(f'CRON_SPEC__{env_site_key}', os.getenv('CRON_SPEC'))
    
    # Log final configuration state
    if site_config.has_wordpress_config:
        logger.info(f"WordPress publishing enabled for {site_key}")
    else:
        logger.info(f"WordPress publishing will run in dry-run mode for {site_key}")
    
    return site_config


def validate_multisite_setup() -> Dict[str, SiteConfig]:
    """
    Validate multi-site configuration setup.
    
    Returns:
        Dictionary mapping site keys to their configurations
    """
    
    sites = get_site_list()
    site_configs = {}
    
    logger.info(f"Validating configuration for {len(sites)} sites: {sites}")
    
    for site_key in sites:
        try:
            site_config = load_site_config(site_key)
            site_configs[site_key] = site_config
            
            status = "✓ Configured" if site_config.has_wordpress_config else "⚠ Dry-run only"
            logger.info(f"  {site_key}: {status}")
            
        except Exception as e:
            logger.error(f"  {site_key}: ✗ Configuration error - {e}")
            raise
    
    return site_configs


def main():
    """CLI entry point for multi-site configuration validation."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Validate multi-site configuration')
    parser.add_argument('--site-key', help='Validate specific site only')
    parser.add_argument('--list-sites', action='store_true', help='List all configured sites')
    
    args = parser.parse_args()
    
    try:
        if args.list_sites:
            sites = get_site_list()
            print(f"Configured sites ({len(sites)}):")
            for site in sites:
                print(f"  - {site}")
            return 0
        
        if args.site_key:
            # Validate single site
            site_config = load_site_config(args.site_key)
            print(f"Site: {args.site_key}")
            print(f"  WordPress configured: {site_config.has_wordpress_config}")
            print(f"  Topic count: {site_config.topic_count}")
            if site_config.cron_spec:
                print(f"  Cron schedule: {site_config.cron_spec}")
        else:
            # Validate all sites
            site_configs = validate_multisite_setup()
            
            configured_count = sum(1 for cfg in site_configs.values() if cfg.has_wordpress_config)
            total_count = len(site_configs)
            
            print(f"\nSummary: {configured_count}/{total_count} sites fully configured for WordPress publishing")
            
        return 0
        
    except Exception as e:
        logger.error(f"Configuration validation failed: {e}")
        return 1


if __name__ == '__main__':
    exit(main())
