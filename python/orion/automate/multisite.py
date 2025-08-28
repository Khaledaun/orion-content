

"""
Multi-site configuration management for Orion automation - Phase 5.

Handles loading site-specific configurations and credentials with support
for per-site environment variable patterns and matrix job execution.
"""

import logging
import os
import re
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass
from urllib.parse import urlparse

from ..api_client import client, OrionAPIError
from ..config import config

logger = logging.getLogger(__name__)


@dataclass
class SiteConfig:
    """Configuration for a single site."""
    site_key: str
    wp_base_url: Optional[str] = None
    wp_username: Optional[str] = None
    wp_app_password: Optional[str] = None
    topic_count: str = "5"  # Can be "5" or "3-7" for ranges
    enrich_prompt_strategy: str = "default"  # "default", "random", or specific filename
    cron_spec: Optional[str] = None  # For future CI scheduling
    
    @property
    def has_wordpress_config(self) -> bool:
        """Check if WordPress configuration is complete."""
        return all([self.wp_base_url, self.wp_username, self.wp_app_password])
    
    def get_topic_count_range(self) -> Tuple[int, int]:
        """Parse topic count as range or single value."""
        if "-" in self.topic_count:
            try:
                min_val, max_val = self.topic_count.split("-", 1)
                return int(min_val.strip()), int(max_val.strip())
            except (ValueError, AttributeError):
                logger.warning(f"Invalid topic count range '{self.topic_count}', using default 5")
                return 5, 5
        else:
            try:
                count = int(self.topic_count)
                return count, count
            except (ValueError, TypeError):
                logger.warning(f"Invalid topic count '{self.topic_count}', using default 5")
                return 5, 5
    
    def to_env_dict(self) -> Dict[str, str]:
        """Convert to environment variable dictionary."""
        env_vars = {}
        
        if self.wp_base_url:
            env_vars['WP_BASE_URL'] = self.wp_base_url
        if self.wp_username:
            env_vars['WP_USERNAME'] = self.wp_username
        if self.wp_app_password:
            env_vars['WP_APP_PASSWORD'] = self.wp_app_password
            
        env_vars['TOPIC_COUNT'] = self.topic_count
        env_vars['ENRICH_PROMPT_STRATEGY'] = self.enrich_prompt_strategy
            
        return env_vars
    
    def validate(self) -> List[str]:
        """Validate site configuration and return list of issues."""
        issues = []
        
        # Validate WordPress URL format
        if self.wp_base_url:
            try:
                parsed = urlparse(self.wp_base_url)
                if not parsed.scheme or not parsed.netloc:
                    issues.append("WordPress URL must be a valid HTTP/HTTPS URL")
            except Exception:
                issues.append("WordPress URL is malformed")
        
        # Validate topic count format
        try:
            min_count, max_count = self.get_topic_count_range()
            if min_count < 1 or max_count < 1 or min_count > max_count:
                issues.append("Topic count must be positive integer or valid range (e.g., '3-7')")
            if max_count > 20:
                issues.append("Topic count should not exceed 20 to avoid API rate limits")
        except Exception:
            issues.append("Topic count format is invalid")
        
        # Validate prompt strategy
        valid_strategies = {"default", "random"}
        if (self.enrich_prompt_strategy not in valid_strategies and 
            not self.enrich_prompt_strategy.endswith('.md')):
            issues.append(f"Prompt strategy must be 'default', 'random', or a .md filename")
        
        return issues


def get_site_list() -> List[str]:
    """
    Get list of sites to process from environment.
    
    Supports multiple formats:
    - ORION_SITES: comma-separated list
    - Site detection from environment variables with __SITE_KEY suffix
    
    Returns:
        List of unique site keys
    """
    sites = set()
    
    # Method 1: Explicit ORION_SITES variable
    sites_env = os.getenv('ORION_SITES', '')
    if sites_env:
        explicit_sites = [site.strip() for site in sites_env.split(',') if site.strip()]
        sites.update(explicit_sites)
        logger.info(f"Found {len(explicit_sites)} sites from ORION_SITES: {explicit_sites}")
    
    # Method 2: Auto-detect from site-specific environment variables
    detected_sites = _detect_sites_from_env()
    if detected_sites:
        sites.update(detected_sites)
        logger.info(f"Auto-detected {len(detected_sites)} sites from environment: {detected_sites}")
    
    # Fallback to default site if nothing found
    if not sites:
        default_site = 'my-site'
        sites.add(default_site)
        logger.info(f"No sites configured, using default: {default_site}")
    
    return sorted(list(sites))


def _detect_sites_from_env() -> Set[str]:
    """
    Auto-detect site keys from environment variables with __SITE_KEY pattern.
    
    Looks for variables like:
    - WP_URL__travel, WP_URL__finance
    - TOPIC_COUNT__health, TOPIC_COUNT__tech
    
    Returns:
        Set of detected site keys
    """
    sites = set()
    
    # Pattern to match site-specific variables
    site_var_pattern = re.compile(r'^(WP_URL|WP_BASE_URL|WP_USERNAME|WP_APP_PASSWORD|TOPIC_COUNT|ENRICH_PROMPT_STRATEGY)__(.+)$')
    
    for env_var in os.environ:
        match = site_var_pattern.match(env_var)
        if match:
            _, site_key = match.groups()
            # Convert underscores back to hyphens for site key
            site_key = site_key.replace('_', '-')
            sites.add(site_key)
    
    return sites


def load_site_config(site_key: str) -> SiteConfig:
    """
    Load configuration for a specific site with Phase 5 enhancements.
    
    Priority order:
    1. Site-specific environment variables (WP_URL__<site>, etc.)
    2. Default environment variables (WP_URL, etc.)
    3. Orion API secrets (kind="wp:<site-key>")
    4. Fallback to empty config (dry-run mode)
    
    Enhanced in Phase 5:
    - Support for TOPIC_COUNT__<site> and ENRICH_PROMPT_STRATEGY__<site>
    - Better site key normalization (hyphens vs underscores)
    - Configuration validation
    
    Args:
        site_key: Site identifier (e.g., 'my-travel-site')
        
    Returns:
        SiteConfig object with resolved configuration
    """
    
    logger.info(f"Loading configuration for site: {site_key}")
    
    # Start with base config
    site_config = SiteConfig(site_key=site_key)
    
    # Normalize site key for environment variables (replace hyphens with underscores)
    env_site_key = site_key.replace('-', '_')
    
    # Try site-specific environment variables first
    site_wp_url = _get_site_specific_env(f'WP_BASE_URL__{env_site_key}', f'WP_URL__{env_site_key}')
    site_wp_user = _get_site_specific_env(f'WP_USERNAME__{env_site_key}')
    site_wp_pass = _get_site_specific_env(f'WP_APP_PASSWORD__{env_site_key}')
    site_topic_count = _get_site_specific_env(f'TOPIC_COUNT__{env_site_key}')
    site_prompt_strategy = _get_site_specific_env(f'ENRICH_PROMPT_STRATEGY__{env_site_key}')
    
    if site_wp_url and site_wp_user and site_wp_pass:
        logger.info(f"Using site-specific environment variables for {site_key}")
        site_config.wp_base_url = site_wp_url
        site_config.wp_username = site_wp_user
        site_config.wp_app_password = site_wp_pass
    else:
        # Fall back to default environment variables
        default_wp_url = _get_site_specific_env('WP_BASE_URL', 'WP_URL')
        default_wp_user = _get_site_specific_env('WP_USERNAME')
        default_wp_pass = _get_site_specific_env('WP_APP_PASSWORD')
        
        if default_wp_url and default_wp_user and default_wp_pass:
            logger.info(f"Using default environment variables for {site_key}")
            site_config.wp_base_url = default_wp_url
            site_config.wp_username = default_wp_user
            site_config.wp_app_password = default_wp_pass
        else:
            # Try loading from Orion API secrets
            logger.info(f"Attempting to load WordPress config from Orion API for {site_key}")
            try:
                wp_config = load_wp_config_from_api(site_key)
                if wp_config:
                    site_config.wp_base_url = wp_config.get('baseUrl')
                    site_config.wp_username = wp_config.get('username')
                    site_config.wp_app_password = wp_config.get('appPassword')
                    logger.info(f"Loaded WordPress config from API for {site_key}")
                else:
                    logger.warning(f"No WordPress config found in API for {site_key}")
            except Exception as e:
                logger.warning(f"Failed to load WordPress config from API for {site_key}: {e}")
    
    # Load additional site-specific configuration with fallbacks
    site_config.topic_count = site_topic_count or os.getenv('TOPIC_COUNT', '5')
    site_config.enrich_prompt_strategy = site_prompt_strategy or os.getenv('ENRICH_PROMPT_STRATEGY', 'default')
    site_config.cron_spec = _get_site_specific_env(f'CRON_SPEC__{env_site_key}') or os.getenv('CRON_SPEC')
    
    # Validate configuration
    issues = site_config.validate()
    if issues:
        logger.warning(f"Configuration issues for {site_key}: {', '.join(issues)}")
    
    # Log final configuration state
    if site_config.has_wordpress_config:
        logger.info(f"WordPress publishing enabled for {site_key}")
    else:
        logger.info(f"WordPress publishing will run in dry-run mode for {site_key}")
    
    logger.info(f"Site {site_key} config: topics={site_config.topic_count}, "
               f"strategy={site_config.enrich_prompt_strategy}")
    
    return site_config


def _get_site_specific_env(*var_names: str) -> Optional[str]:
    """Get first available environment variable from list."""
    for var_name in var_names:
        value = os.getenv(var_name)
        if value:
            return value
    return None


def load_wp_config_from_api(site_key: str) -> Optional[Dict[str, str]]:
    """
    Load WordPress configuration from Orion API secrets.
    
    Looks for secrets with kind="wp:<site-key>" containing:
    {
        "baseUrl": "https://wordpress.site",
        "username": "wp_user",
        "appPassword": "wp_app_password"
    }
    
    Args:
        site_key: Site identifier
        
    Returns:
        WordPress config dictionary or None if not found
    """
    
    try:
        # This would require an API endpoint to retrieve secrets
        # For now, we'll implement a placeholder that always returns None
        # In a real implementation, this would call something like:
        # response = client._make_request('GET', f'/api/setup/secrets/wp:{site_key}')
        # return response.get('data', {})
        
        logger.debug(f"API-based WordPress config retrieval not implemented for {site_key}")
        return None
        
    except OrionAPIError as e:
        if e.status_code == 404:
            logger.debug(f"No WordPress config found in API for site {site_key}")
            return None
        else:
            logger.error(f"Error loading WordPress config for {site_key}: {e}")
            raise


def apply_site_config_to_env(site_config: SiteConfig):
    """
    Temporarily apply site configuration to environment variables.
    
    This is useful for ensuring the global config object picks up
    site-specific settings during pipeline execution.
    
    Args:
        site_config: Site configuration to apply
    """
    
    env_vars = site_config.to_env_dict()
    
    for key, value in env_vars.items():
        os.environ[key] = value
        logger.debug(f"Set environment variable: {key}=***" if 'password' in key.lower() 
                    else f"Set environment variable: {key}={value}")


def validate_multisite_setup() -> Dict[str, SiteConfig]:
    """
    Validate multi-site configuration setup with Phase 5 enhancements.
    
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
            
            # Enhanced status reporting
            wp_status = "✓ Configured" if site_config.has_wordpress_config else "⚠ Dry-run only"
            topic_range = site_config.get_topic_count_range()
            topic_display = f"{topic_range[0]}" if topic_range[0] == topic_range[1] else f"{topic_range[0]}-{topic_range[1]}"
            
            logger.info(f"  {site_key}: {wp_status}, topics={topic_display}, strategy={site_config.enrich_prompt_strategy}")
            
            # Report any configuration issues
            issues = site_config.validate()
            if issues:
                logger.warning(f"  {site_key}: Issues - {', '.join(issues)}")
            
        except Exception as e:
            logger.error(f"  {site_key}: ✗ Configuration error - {e}")
            raise
    
    return site_configs


def get_matrix_site_combinations() -> List[Dict[str, str]]:
    """
    Generate matrix job combinations for GitHub Actions.
    
    Returns list of dictionaries suitable for matrix strategy, e.g.:
    [
        {"site": "travel", "topic_count": "5", "strategy": "random"},
        {"site": "finance", "topic_count": "3-7", "strategy": "listicle.md"}
    ]
    """
    
    sites = get_site_list()
    combinations = []
    
    for site_key in sites:
        try:
            site_config = load_site_config(site_key)
            combinations.append({
                "site": site_key,
                "topic_count": site_config.topic_count,
                "strategy": site_config.enrich_prompt_strategy,
                "has_wp": "true" if site_config.has_wordpress_config else "false"
            })
        except Exception as e:
            logger.error(f"Failed to generate matrix combination for {site_key}: {e}")
            # Include with defaults to avoid breaking matrix
            combinations.append({
                "site": site_key,
                "topic_count": "5",
                "strategy": "default",
                "has_wp": "false"
            })
    
    return combinations


def main():
    """CLI entry point for multi-site configuration validation."""
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description='Validate multi-site configuration')
    parser.add_argument('--site-key', help='Validate specific site only')
    parser.add_argument('--list-sites', action='store_true', help='List all configured sites')
    parser.add_argument('--matrix', action='store_true', help='Output GitHub Actions matrix JSON')
    parser.add_argument('--validate-all', action='store_true', help='Validate all sites (default)')
    
    args = parser.parse_args()
    
    try:
        if args.list_sites:
            sites = get_site_list()
            print(f"Configured sites ({len(sites)}):")
            for site in sites:
                print(f"  - {site}")
            return 0
        
        if args.matrix:
            combinations = get_matrix_site_combinations()
            print(json.dumps({"include": combinations}, indent=2))
            return 0
        
        if args.site_key:
            # Validate single site
            site_config = load_site_config(args.site_key)
            print(f"Site: {args.site_key}")
            print(f"  WordPress configured: {site_config.has_wordpress_config}")
            
            topic_range = site_config.get_topic_count_range()
            topic_display = f"{topic_range[0]}" if topic_range[0] == topic_range[1] else f"{topic_range[0]}-{topic_range[1]}"
            print(f"  Topic count: {topic_display}")
            print(f"  Prompt strategy: {site_config.enrich_prompt_strategy}")
            
            if site_config.cron_spec:
                print(f"  Cron schedule: {site_config.cron_spec}")
            
            issues = site_config.validate()
            if issues:
                print(f"  Issues: {', '.join(issues)}")
        else:
            # Validate all sites (default)
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

