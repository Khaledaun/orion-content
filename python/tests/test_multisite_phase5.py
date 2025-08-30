

"""
Tests for Phase 5 multi-site automation functionality.
"""

import pytest
import os
import tempfile
import json
from unittest.mock import Mock, patch, MagicMock, call
from pathlib import Path

from orion.automate.multisite import (
    SiteConfig, get_site_list, load_site_config, validate_multisite_setup,
    get_matrix_site_combinations, _detect_sites_from_env
)
from orion.automate.run_pipeline_multisite import MultiSitePipelineRunner


class TestSiteConfigPhase5:
    """Test enhanced SiteConfig functionality."""
    
    def test_topic_count_single_value(self):
        """Test parsing single topic count value."""
        config = SiteConfig(site_key="test", topic_count="7")
        min_count, max_count = config.get_topic_count_range()
        assert min_count == 7
        assert max_count == 7
    
    def test_topic_count_range(self):
        """Test parsing topic count range."""
        config = SiteConfig(site_key="test", topic_count="3-8")
        min_count, max_count = config.get_topic_count_range()
        assert min_count == 3
        assert max_count == 8
    
    def test_topic_count_invalid_format(self):
        """Test handling of invalid topic count formats."""
        config = SiteConfig(site_key="test", topic_count="invalid")
        min_count, max_count = config.get_topic_count_range()
        assert min_count == 5  # Default fallback
        assert max_count == 5
        
        config = SiteConfig(site_key="test", topic_count="10-5")  # Invalid range
        min_count, max_count = config.get_topic_count_range()
        assert min_count == 5
        assert max_count == 5
    
    def test_validate_complete_config(self):
        """Test validation of complete, valid configuration."""
        config = SiteConfig(
            site_key="test-site",
            wp_base_url="https://example.com",
            wp_username="admin",
            wp_app_password="secret123",
            topic_count="5",
            enrich_prompt_strategy="random"
        )
        
        issues = config.validate()
        assert issues == []
    
    def test_validate_invalid_url(self):
        """Test validation catches invalid URLs."""
        config = SiteConfig(
            site_key="test",
            wp_base_url="not-a-url",
            topic_count="5"
        )
        
        issues = config.validate()
        assert any("URL" in issue for issue in issues)
    
    def test_validate_invalid_topic_count(self):
        """Test validation catches invalid topic counts."""
        config = SiteConfig(site_key="test", topic_count="0")
        issues = config.validate()
        assert any("positive" in issue for issue in issues)
        
        config = SiteConfig(site_key="test", topic_count="25")
        issues = config.validate()
        assert any("exceed 20" in issue for issue in issues)
    
    def test_validate_invalid_prompt_strategy(self):
        """Test validation catches invalid prompt strategies."""
        config = SiteConfig(site_key="test", enrich_prompt_strategy="invalid_strategy")
        issues = config.validate()
        assert any("Prompt strategy" in issue for issue in issues)
        
        # Valid strategies should pass
        config = SiteConfig(site_key="test", enrich_prompt_strategy="custom.md")
        issues = config.validate()
        assert not any("Prompt strategy" in issue for issue in issues)


class TestSiteDetection:
    """Test site detection and configuration loading."""
    
    def test_detect_sites_from_env_variables(self):
        """Test auto-detection of sites from environment variables."""
        with patch.dict(os.environ, {
            'WP_URL__travel': 'https://travel.example.com',
            'WP_USERNAME__finance': 'admin',
            'TOPIC_COUNT__health_site': '7',
            'ENRICH_PROMPT_STRATEGY__tech': 'random',
            'UNRELATED_VAR': 'value'
        }, clear=False):
            
            sites = _detect_sites_from_env()
            expected_sites = {'travel', 'finance', 'health-site', 'tech'}
            assert sites == expected_sites
    
    def test_get_site_list_explicit_orion_sites(self):
        """Test site list from explicit ORION_SITES variable."""
        with patch.dict(os.environ, {
            'ORION_SITES': 'site1,site2,site3'
        }, clear=True):
            sites = get_site_list()
            assert sites == ['site1', 'site2', 'site3']
    
    def test_get_site_list_mixed_sources(self):
        """Test site list combining explicit and detected sources."""
        with patch.dict(os.environ, {
            'ORION_SITES': 'explicit1,explicit2',
            'WP_URL__detected': 'https://example.com',
            'TOPIC_COUNT__another': '5'
        }, clear=False):
            sites = get_site_list()
            # Should include both explicit and detected, deduplicated and sorted
            assert 'explicit1' in sites
            assert 'explicit2' in sites
            assert 'detected' in sites
            assert 'another' in sites
    
    def test_get_site_list_default_fallback(self):
        """Test fallback to default site when no configuration found."""
        with patch.dict(os.environ, {}, clear=True):
            sites = get_site_list()
            assert sites == ['my-site']
    
    def test_load_site_config_site_specific_vars(self):
        """Test loading site-specific configuration variables."""
        with patch.dict(os.environ, {
            'WP_BASE_URL__travel': 'https://travel.example.com',
            'WP_USERNAME__travel': 'travel_admin',
            'WP_APP_PASSWORD__travel': 'travel_secret',
            'TOPIC_COUNT__travel': '3-7',
            'ENRICH_PROMPT_STRATEGY__travel': 'listicle.md'
        }, clear=True):
            
            config = load_site_config('travel')
            
            assert config.site_key == 'travel'
            assert config.wp_base_url == 'https://travel.example.com'
            assert config.wp_username == 'travel_admin'
            assert config.wp_app_password == 'travel_secret'
            assert config.topic_count == '3-7'
            assert config.enrich_prompt_strategy == 'listicle.md'
            assert config.has_wordpress_config is True
    
    def test_load_site_config_fallback_to_defaults(self):
        """Test fallback to default environment variables."""
        with patch.dict(os.environ, {
            'WP_BASE_URL': 'https://default.example.com',
            'WP_USERNAME': 'default_admin',
            'WP_APP_PASSWORD': 'default_secret',
            'TOPIC_COUNT': '10',
            'ENRICH_PROMPT_STRATEGY': 'random'
        }, clear=True):
            
            config = load_site_config('some-site')
            
            assert config.wp_base_url == 'https://default.example.com'
            assert config.wp_username == 'default_admin'
            assert config.topic_count == '10'
            assert config.enrich_prompt_strategy == 'random'
    
    def test_load_site_config_dry_run_mode(self):
        """Test dry-run mode when no WordPress config available."""
        with patch.dict(os.environ, {}, clear=True):
            config = load_site_config('test-site')
            
            assert config.has_wordpress_config is False
            assert config.topic_count == '5'  # Default
            assert config.enrich_prompt_strategy == 'default'


class TestMatrixGeneration:
    """Test matrix job generation for GitHub Actions."""
    
    @patch('orion.automate.multisite.get_site_list')
    @patch('orion.automate.multisite.load_site_config')
    def test_get_matrix_site_combinations(self, mock_load_config, mock_get_sites):
        """Test generation of matrix combinations for CI."""
        # Mock site list
        mock_get_sites.return_value = ['travel', 'finance', 'health']
        
        # Mock site configurations
        travel_config = SiteConfig(
            site_key='travel',
            topic_count='3-7',
            enrich_prompt_strategy='listicle.md',
            wp_base_url='https://travel.example.com',
            wp_username='admin',
            wp_app_password='secret'
        )
        
        finance_config = SiteConfig(
            site_key='finance',
            topic_count='5',
            enrich_prompt_strategy='random'
            # No WordPress config - dry run
        )
        
        health_config = SiteConfig(
            site_key='health',
            topic_count='4',
            enrich_prompt_strategy='default',
            wp_base_url='https://health.example.com',
            wp_username='admin',
            wp_app_password='secret'
        )
        
        mock_load_config.side_effect = lambda site: {
            'travel': travel_config,
            'finance': finance_config,
            'health': health_config
        }[site]
        
        combinations = get_matrix_site_combinations()
        
        assert len(combinations) == 3
        
        # Check travel site
        travel_combo = next(c for c in combinations if c['site'] == 'travel')
        assert travel_combo['topic_count'] == '3-7'
        assert travel_combo['strategy'] == 'listicle.md'
        assert travel_combo['has_wp'] == 'true'
        
        # Check finance site (dry run)
        finance_combo = next(c for c in combinations if c['site'] == 'finance')
        assert finance_combo['has_wp'] == 'false'
        
        # Check health site
        health_combo = next(c for c in combinations if c['site'] == 'health')
        assert health_combo['topic_count'] == '4'
        assert health_combo['strategy'] == 'default'


class TestMultiSitePipelineRunner:
    """Test the multi-site pipeline orchestration."""
    
    def test_multisite_runner_initialization(self):
        """Test MultiSitePipelineRunner initialization."""
        runner = MultiSitePipelineRunner(
            sites=['site1', 'site2'],
            parallel=False,
            max_workers=2
        )
        
        assert runner.sites == ['site1', 'site2']
        assert runner.parallel is False
        assert runner.max_workers == 2
        assert runner.results == {}
    
    @patch('orion.automate.multisite.get_site_list')
    def test_multisite_runner_auto_detect_sites(self, mock_get_sites):
        """Test auto-detection of sites when none specified."""
        mock_get_sites.return_value = ['auto1', 'auto2', 'auto3']
        
        runner = MultiSitePipelineRunner()
        
        assert runner.sites == ['auto1', 'auto2', 'auto3']
    
    def test_log_global_event(self):
        """Test global event logging."""
        with tempfile.TemporaryDirectory() as temp_dir:
            original_cwd = os.getcwd()
            os.chdir(temp_dir)
            
            try:
                runner = MultiSitePipelineRunner(sites=['test-site'])
                runner.log_global_event('test_event', True, test_data='value')
                
                # Check log file exists
                assert runner.global_log_file.exists()
                
                # Check content
                with open(runner.global_log_file) as f:
                    log_line = f.read().strip()
                    log_data = json.loads(log_line)
                
                assert log_data['event_type'] == 'test_event'
                assert log_data['ok'] is True
                assert log_data['test_data'] == 'value'
                
            finally:
                os.chdir(original_cwd)
    
    @patch('orion.automate.run_pipeline_multisite.run_single_site_pipeline')
    @patch('orion.automate.multisite.load_site_config')
    @patch('orion.automate.multisite.apply_site_config_to_env')
    def test_run_site(self, mock_apply_config, mock_load_config, mock_run_pipeline):
        """Test running pipeline for a single site."""
        # Mock site configuration
        site_config = SiteConfig(
            site_key='test-site',
            topic_count='3-7',
            enrich_prompt_strategy='random'
        )
        mock_load_config.return_value = site_config
        
        # Mock pipeline result
        pipeline_result = {
            'site': 'test-site',
            'total_stages': 5,
            'failed_stages': 0,
            'success_rate': 1.0,
            'duration_minutes': 2.5
        }
        mock_run_pipeline.return_value = pipeline_result
        
        runner = MultiSitePipelineRunner(sites=['test-site'])
        result = runner._run_site('test-site', topic_count=None, publish=True, dry_run_wp=None)
        
        # Verify configuration was loaded and applied
        mock_load_config.assert_called_once_with('test-site')
        mock_apply_config.assert_called_once_with(site_config)
        
        # Verify pipeline was called with random topic count in range
        assert mock_run_pipeline.called
        args, kwargs = mock_run_pipeline.call_args
        assert kwargs['site_key'] == 'test-site'
        assert 3 <= kwargs['topic_count'] <= 7  # Should be in range
        assert kwargs['publish'] is True
        assert kwargs['dry_run_wp'] is None
        
        assert result == pipeline_result
    
    @patch('orion.automate.run_pipeline_multisite.MultiSitePipelineRunner._run_site')
    def test_run_sequential(self, mock_run_site):
        """Test sequential execution of multiple sites."""
        # Mock site results
        site_results = {
            'site1': {'site': 'site1', 'total_stages': 5, 'failed_stages': 0, 'success_rate': 1.0, 'duration_minutes': 2.0},
            'site2': {'site': 'site2', 'total_stages': 5, 'failed_stages': 1, 'success_rate': 0.8, 'duration_minutes': 3.0}
        }
        
        def mock_run_side_effect(site_key, *args, **kwargs):
            return site_results[site_key]
        
        mock_run_site.side_effect = mock_run_side_effect
        
        runner = MultiSitePipelineRunner(sites=['site1', 'site2'], parallel=False)
        summary = runner._run_sequential(topic_count=5, publish=True, dry_run_wp=None)
        
        # Verify both sites were processed
        assert mock_run_site.call_count == 2
        assert runner.results == site_results
        
        # Check summary
        multisite_stats = summary['multisite_execution']
        assert multisite_stats['total_sites'] == 2
        assert multisite_stats['successful_sites'] == 1  # Only site1 has 0 failed stages
        assert multisite_stats['failed_sites'] == 1


class TestValidationAndIntegration:
    """Test validation and integration scenarios."""
    
    @patch('orion.automate.multisite.get_site_list')
    @patch('orion.automate.multisite.load_site_config')
    def test_validate_multisite_setup(self, mock_load_config, mock_get_sites):
        """Test multi-site setup validation."""
        mock_get_sites.return_value = ['site1', 'site2']
        
        site1_config = SiteConfig(
            site_key='site1',
            wp_base_url='https://site1.com',
            wp_username='admin',
            wp_app_password='secret'
        )
        
        site2_config = SiteConfig(site_key='site2')  # Dry-run only
        
        mock_load_config.side_effect = lambda site: {
            'site1': site1_config,
            'site2': site2_config
        }[site]
        
        configs = validate_multisite_setup()
        
        assert len(configs) == 2
        assert configs['site1'].has_wordpress_config is True
        assert configs['site2'].has_wordpress_config is False
    
    def test_topic_count_randomization_in_range(self):
        """Test that topic count randomization respects configured ranges."""
        config = SiteConfig(site_key='test', topic_count='5-10')
        
        # Test multiple iterations to ensure randomization works
        results = []
        for _ in range(20):
            min_count, max_count = config.get_topic_count_range()
            # Simulate the randomization that would happen in _run_site
            import random
            count = random.randint(min_count, max_count)
            results.append(count)
        
        # All results should be in range
        assert all(5 <= count <= 10 for count in results)
        # Should have some variation (not all the same)
        assert len(set(results)) > 1

