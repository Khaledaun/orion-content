
"""API client for Orion Content Management System."""

import logging
from typing import Optional, List, Dict, Any
from datetime import date, datetime
import requests

from .config import config

logger = logging.getLogger(__name__)


class OrionAPIError(Exception):
    """Custom exception for Orion API errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None, response_body: Optional[str] = None):
        self.status_code = status_code
        self.response_body = response_body
        super().__init__(message)


class OrionAPIClient:
    """Client for interacting with Orion Content API."""
    
    def __init__(self):
        self.session = config.get_session()
        self.base_url = config.orion_base_url
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[Any, Any]:
        """Make HTTP request with error handling."""
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_body = None
            try:
                error_body = response.text
            except:
                pass
            
            raise OrionAPIError(
                f"API request failed: {method} {url} - {e}",
                status_code=response.status_code,
                response_body=error_body
            )
        except requests.exceptions.RequestException as e:
            raise OrionAPIError(f"Network error: {e}")
    
    def health_check(self) -> Dict[str, Any]:
        """Check API health."""
        return self._make_request('GET', '/api/health')
    
    def get_sites(self) -> List[Dict[str, Any]]:
        """Get all sites with their categories."""
        response = self._make_request('GET', '/api/sites')
        return response if isinstance(response, list) else response.get('sites', [])
    
    def get_site_by_key(self, site_key: str) -> Optional[Dict[str, Any]]:
        """Get a site by its key."""
        sites = self.get_sites()
        for site in sites:
            if site.get('key') == site_key:
                return site
        return None
    
    def get_current_iso_week(self, start_date: Optional[date] = None) -> str:
        """Generate current ISO week string (YYYY-WW)."""
        if start_date is None:
            start_date = date.today()
        
        # Get ISO week
        iso_year, iso_week, _ = start_date.isocalendar()
        return f"{iso_year}-W{iso_week:02d}"
    
    def ensure_week(self, site_key: str, start_date: Optional[date] = None) -> Dict[str, Any]:
        """Ensure current week exists, create if needed."""
        iso_week = self.get_current_iso_week(start_date)
        
        try:
            # Try to create the week
            week_data = {'isoWeek': iso_week}
            week = self._make_request('POST', '/api/weeks', json=week_data)
            logger.info(f"Created new week: {iso_week}")
            return week
        except OrionAPIError as e:
            if e.status_code == 400 and 'already exists' in str(e).lower():
                # Week already exists, fetch it
                weeks = self._make_request('GET', '/api/weeks')
                for week in weeks:
                    if week.get('isoWeek') == iso_week:
                        logger.info(f"Found existing week: {iso_week}")
                        return week
                
                raise OrionAPIError(f"Week {iso_week} should exist but not found")
            else:
                raise
    
    def bulk_create_topics(self, week_id: str, topics: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Bulk create topics for a week."""
        if not topics:
            return {'count': 0}
        
        # Validate topic structure
        for i, topic in enumerate(topics):
            required_fields = ['siteId', 'categoryId', 'title']
            for field in required_fields:
                if field not in topic:
                    raise ValueError(f"Topic {i} missing required field: {field}")
        
        payload = {'topics': topics}
        return self._make_request('POST', f'/api/weeks/{week_id}/topics', json=payload)
    
    def job_run_start(self, kind: str, meta: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Record job run start (if endpoint exists)."""
        try:
            job_data = {
                'jobType': kind,
                'startedAt': datetime.utcnow().isoformat() + 'Z',
                **meta
            }
            return self._make_request('POST', '/api/jobrun', json=job_data)
        except OrionAPIError as e:
            if e.status_code == 404:
                logger.warning("JobRun endpoint not available, skipping")
                return None
            raise
    
    def job_run_finish(self, run_id: str, status: str, meta: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Record job run completion (if endpoint exists)."""
        try:
            job_data = {
                'jobType': f"finish-{run_id}",  # Simplified approach
                'startedAt': datetime.utcnow().isoformat() + 'Z',
                'endedAt': datetime.utcnow().isoformat() + 'Z',
                'ok': status == 'success',
                'notes': f"Status: {status}",
                **meta
            }
            return self._make_request('POST', '/api/jobrun', json=job_data)
        except OrionAPIError as e:
            if e.status_code == 404:
                logger.warning("JobRun endpoint not available, skipping")
                return None
            raise


# Default client instance
client = OrionAPIClient()
