

"""Configuration and environment handling for Orion pipelines."""

import os
import logging
from typing import Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class Config:
    """Configuration class for Orion pipelines."""
    
    def __init__(self):
        self.orion_base_url = os.getenv('ORION_BASE_URL', 'http://localhost:3000')
        self.orion_console_token = os.getenv('ORION_CONSOLE_TOKEN')
        
        # WordPress configuration (optional)
        self.wp_base_url = os.getenv('WP_BASE_URL')
        self.wp_username = os.getenv('WP_USERNAME') 
        self.wp_app_password = os.getenv('WP_APP_PASSWORD')
        
        # Phase 7: Quality Framework Configuration
        self.originality_provider = os.getenv('ORIGINALITY_PROVIDER', 'placeholder')
        self.perplexity_enabled = os.getenv('PERPLEXITY_ENABLED', 'false').lower() == 'true'
        self.perplexity_api_key = os.getenv('PERPLEXITY_API_KEY')
        self.rulebook_enforcement_enabled = os.getenv('RULEBOOK_ENFORCEMENT_ENABLED', 'true').lower() == 'true'
        
        # Validate required config (skip for tests)
        if not self.orion_console_token and not os.getenv('ORION_TESTING'):
            raise ValueError("ORION_CONSOLE_TOKEN environment variable is required")
        
        self.orion_base_url = self.orion_base_url.rstrip('/')
        
        if self.wp_base_url:
            self.wp_base_url = self.wp_base_url.rstrip('/')
    
    @property
    def has_wordpress_config(self) -> bool:
        """Check if WordPress configuration is complete."""
        return all([self.wp_base_url, self.wp_username, self.wp_app_password])
    
    @property
    def has_perplexity_config(self) -> bool:
        """Check if Perplexity configuration is complete."""
        return self.perplexity_enabled and bool(self.perplexity_api_key)
    
    def get_session(self) -> requests.Session:
        """Create a configured requests session with auth and retry logic."""
        session = requests.Session()
        
        # Set authorization header
        session.headers.update({
            'Authorization': f'Bearer {self.orion_console_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        
        # Set reasonable timeout
        session.timeout = 30
        
        return session
    
    def mask_secrets(self) -> dict:
        """Return configuration with secrets masked for logging."""
        return {
            'orion_base_url': self.orion_base_url,
            'orion_console_token': '***' if self.orion_console_token else None,
            'wp_base_url': self.wp_base_url,
            'wp_username': self.wp_username,
            'wp_app_password': '***' if self.wp_app_password else None,
            'originality_provider': self.originality_provider,
            'perplexity_enabled': self.perplexity_enabled,
            'perplexity_api_key': '***' if self.perplexity_api_key else None,
            'rulebook_enforcement_enabled': self.rulebook_enforcement_enabled,
            'has_wordpress_config': self.has_wordpress_config,
            'has_perplexity_config': self.has_perplexity_config,
        }


# Global config instance
config = Config()
