
"""Tests for automation pipeline."""

import pytest
from unittest.mock import Mock, patch, call, MagicMock
from pathlib import Path
import json
import tempfile
import os

from orion.automate.run_pipeline import (
    run_pipeline, deduplicate_topics, PipelineLogger, main
)
from orion.automate.multisite import (
    SiteConfig, load_site_config, get_site_list, validate_multisite_setup
)
from orion.automate.enrich import (
    generate_post, extract_main_topic, extract_categories,
    get_available_prompts, load_prompt_template
)
from orion.automate.multisite import parse_topic_count_range


class TestPipelineLogger:
    """Test suite for PipelineLogger."""
    
    def test_log_event_creates_file(self):
        """Test that logging creates proper files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Change to temp directory for test
            original_cwd = os.getcwd()
            os.chdir(temp_dir)
            
            try:
                logger = PipelineLogger("test-site")
                logger.log_event("test_stage", True, extra_data="test")
                
                # Check log file exists
                assert logger.log_file.exists()
                
                # Check content
                with open(logger.log_file) as f:
                    log_line = f.read().strip()
                    log_data = json.loads(log_line)
                
                assert log_data["site"] == "test-site"
                assert log_data["stage"] == "test_stage"
                assert log_data["ok"] is True
                assert log_data["extra_data"] == "test"
                assert "ts" in log_data
                
            finally:
                os.chdir(original_cwd)
    
    def test_get_summary(self):
        """Test pipeline summary generation."""
        with tempfile.TemporaryDirectory() as temp_dir:
            original_cwd = os.getcwd()
            os.chdir(temp_dir)
            
            try:
                logger = PipelineLogger("test-site")
                logger.log_event("stage1", True)
                logger.log_event("stage2", False, error="test error")
                
                summary = logger.get_summary()
                
                assert summary["site"] == "test-site"
                assert summary["total_stages"] == 2
                assert summary["failed_stages"] == 1
                assert summary["success_rate"] == 0.5
                assert "duration_minutes" in summary
                
            finally:
                os.chdir(original_cwd)


class TestTopicDeduplication:
    """Test suite for topic deduplication."""
    
    def test_deduplicate_topics_removes_duplicates(self):
        """Test that duplicate titles are removed."""
        topics = [
            {"title": "Topic A", "id": 1},
            {"title": "Topic B", "id": 2},
            {"title": "Topic A", "id": 3},  # Duplicate
            {"title": "Topic C", "id": 4}
        ]
        
        unique_topics = deduplicate_topics(topics)
        
        assert len(unique_topics) == 3
        titles = [topic["title"] for topic in unique_topics]
        assert titles == ["Topic A", "Topic B", "Topic C"]
    
    def test_deduplicate_topics_with_existing_titles(self):
        """Test deduplication against existing titles."""
        topics = [
            {"title": "Topic A", "id": 1},
            {"title": "Topic B", "id": 2}
        ]
        
        existing_titles = {"Topic A"}
        
        unique_topics = deduplicate_topics(topics, existing_titles)
        
        assert len(unique_topics) == 1
        assert unique_topics[0]["title"] == "Topic B"


class TestSiteConfig:
    """Test suite for SiteConfig."""
    
    def test_site_config_wordpress_detection(self):
        """Test WordPress configuration detection."""
        # Complete config
        config = SiteConfig(
            site_key="test",
            wp_base_url="https://example.com",
            wp_username="user",
            wp_app_password="pass"
        )
        assert config.has_wordpress_config is True
        
        # Incomplete config
        config = SiteConfig(site_key="test", wp_base_url="https://example.com")
        assert config.has_wordpress_config is False
    
    def test_to_env_dict(self):
        """Test conversion to environment dictionary."""
        config = SiteConfig(
            site_key="test",
            wp_base_url="https://example.com",
            wp_username="user",
            wp_app_password="pass"
        )
        
        env_dict = config.to_env_dict()
        
        assert env_dict == {
            'WP_BASE_URL': 'https://example.com',
            'WP_USERNAME': 'user',
            'WP_APP_PASSWORD': 'pass'
        }


class TestMultiSiteConfiguration:
    """Test suite for multi-site configuration."""
    
    @patch.dict(os.environ, {'ORION_SITES': 'site1,site2,site3'})
    def test_get_site_list_from_env(self):
        """Test getting site list from environment."""
        sites = get_site_list()
        assert sites == ['site1', 'site2', 'site3']
    
    @patch.dict(os.environ, {}, clear=True)
    def test_get_site_list_default(self):
        """Test default site list."""
        sites = get_site_list()
        assert sites == ['my-site']
    
    @patch.dict(os.environ, {
        'WP_BASE_URL__test_site': 'https://test.com',
        'WP_USERNAME__test_site': 'testuser',
        'WP_APP_PASSWORD__test_site': 'testpass'
    })
    def test_load_site_config_site_specific_env(self):
        """Test loading site-specific environment variables."""
        config = load_site_config('test-site')
        
        assert config.site_key == 'test-site'
        assert config.wp_base_url == 'https://test.com'
        assert config.wp_username == 'testuser'
        assert config.wp_app_password == 'testpass'
        assert config.has_wordpress_config is True
    
    @patch.dict(os.environ, {
        'WP_BASE_URL': 'https://default.com',
        'WP_USERNAME': 'defaultuser',
        'WP_APP_PASSWORD': 'defaultpass'
    })
    def test_load_site_config_default_env(self):
        """Test loading default environment variables."""
        config = load_site_config('any-site')
        
        assert config.site_key == 'any-site'
        assert config.wp_base_url == 'https://default.com'
        assert config.wp_username == 'defaultuser'
        assert config.wp_app_password == 'defaultpass'
        assert config.has_wordpress_config is True
    
    @patch.dict(os.environ, {}, clear=True)
    def test_load_site_config_no_wp_config(self):
        """Test loading config with no WordPress settings."""
        config = load_site_config('test-site')
        
        assert config.site_key == 'test-site'
        assert config.has_wordpress_config is False


class TestContentEnrichment:
    """Test suite for content enrichment."""
    
    def test_generate_post_basic(self):
        """Test basic post generation."""
        topic = {
            'title': 'AI Trend #05 — Machine Learning',
            'angle': 'Exploring ML applications in business',
            'score': 0.8
        }
        
        result = generate_post(topic)
        post = result['post_data']
        metadata = result['metadata']
        
        assert post['title'] == 'AI Trend #05 — Machine Learning'
        assert post['status'] == 'draft'
        assert 'content' in post
        assert len(post['content']) > 100  # Should be substantial content
        assert isinstance(post['categories'], list)
        assert len(post['categories']) > 0
        
        # Verify metadata exists
        assert 'prompt_used' in metadata
        assert 'llm_model' in metadata
    
    def test_extract_main_topic(self):
        """Test topic extraction from titles."""
        test_cases = [
            ("AI Trend #05 — Machine Learning", "Machine Learning"),
            ("Tech Update: Cloud Computing", "Cloud Computing"),
            ("Latest in Business: Remote Work", "Remote Work"),
            ("Simple Title", "Simple Title")
        ]
        
        for title, expected in test_cases:
            result = extract_main_topic(title)
            assert expected.lower() in result.lower()
    
    def test_extract_categories(self):
        """Test category extraction from titles."""
        test_cases = [
            ("AI Technology Breakthrough", ["Technology"]),
            ("Business Strategy Analysis", ["Business", "Analysis"]),
            ("Cloud Computing Innovation", ["Technology", "Innovation"]),
            ("Random Topic", ["General", "Industry News"])
        ]
        
        for title, expected_categories in test_cases:
            categories = extract_categories(title)
            
            # At least one expected category should be present
            has_expected = any(exp in categories for exp in expected_categories)
            assert has_expected or categories == ["General", "Industry News"]


class TestRunPipeline:
    """Test suite for main pipeline functionality."""
    
    @patch('orion.automate.run_pipeline.client')
    @patch('orion.automate.run_pipeline.load_site_config')
    @patch('orion.automate.run_pipeline.generate_topics_for_site')
    @patch('orion.automate.run_pipeline.WordPressPublisher')
    @patch('orion.automate.run_pipeline.generate_post')
    def test_run_pipeline_success(self, mock_generate_post, mock_wp_publisher, 
                                mock_generate_topics, mock_load_config, mock_client):
        """Test successful pipeline execution."""
        
        # Setup mocks
        mock_site_config = Mock()
        mock_site_config.has_wordpress_config = True
        mock_site_config.topic_count = 2
        mock_site_config.topic_count_range = (2, 2)
        mock_site_config.enrich_prompt_strategy = 'default'
        mock_load_config.return_value = mock_site_config
        
        mock_client.health_check.return_value = {'ok': True}
        mock_client.ensure_week.return_value = {
            'id': 'week123',
            'isoWeek': '2024-W10'
        }
        mock_client.get_site_by_key.return_value = {
            'id': 'site123',
            'key': 'test-site',
            'name': 'Test Site'
        }
        mock_client.bulk_create_topics.return_value = {'count': 2}
        mock_client.job_run_start.return_value = None  # Skip job tracking in tests
        mock_client.job_run_finish.return_value = None
        
        mock_topics = [
            {'siteId': 'site123', 'categoryId': 'cat1', 'title': 'Topic 1'},
            {'siteId': 'site123', 'categoryId': 'cat2', 'title': 'Topic 2'}
        ]
        mock_generate_topics.return_value = mock_topics
        
        mock_generate_post.return_value = {
            'post_data': {
                'title': 'Test Post',
                'content': '<p>Test content</p>',
                'status': 'draft',
                'categories': ['Tech']
            },
            'metadata': {
                'prompt_used': 'template-based',
                'llm_model': 'template-based',
                'input_tokens': 0,
                'output_tokens': 0,
                'estimated_cost': 0.0
            }
        }
        
        mock_wp_instance = Mock()
        mock_wp_instance.create_post.return_value = {'id': 123}
        mock_wp_instance.config = Mock()
        mock_wp_publisher.return_value = mock_wp_instance
        
        # Run pipeline
        with tempfile.TemporaryDirectory() as temp_dir:
            original_cwd = os.getcwd()
            os.chdir(temp_dir)
            
            try:
                summary = run_pipeline('test-site', topic_count=2, publish=True, enable_jitter=False)
                
                # Verify results
                assert summary['failed_stages'] == 0
                assert summary['site'] == 'test-site'
                
                # Verify API calls
                mock_client.health_check.assert_called_once()
                mock_client.ensure_week.assert_called_once_with('test-site')
                mock_client.get_site_by_key.assert_called_once_with('test-site')
                mock_client.bulk_create_topics.assert_called_once_with('week123', mock_topics)
                
                # Verify WordPress publishing
                assert mock_wp_instance.create_post.call_count == 2
                
            finally:
                os.chdir(original_cwd)
    
    @patch('orion.automate.run_pipeline.client')
    @patch('orion.automate.run_pipeline.load_site_config')
    def test_run_pipeline_api_failure(self, mock_load_config, mock_client):
        """Test pipeline handling of API failures."""
        
        mock_site_config = Mock()
        mock_site_config.has_wordpress_config = False
        mock_site_config.topic_count = 5
        mock_site_config.topic_count_range = (5, 5)
        mock_site_config.enrich_prompt_strategy = 'default'
        mock_load_config.return_value = mock_site_config
        
        # Mock API failure
        from orion.api_client import OrionAPIError
        mock_client.health_check.side_effect = OrionAPIError("API down")
        mock_client.job_run_start.return_value = None
        mock_client.job_run_finish.return_value = None
        
        with tempfile.TemporaryDirectory() as temp_dir:
            original_cwd = os.getcwd()
            os.chdir(temp_dir)
            
            try:
                summary = run_pipeline('test-site', enable_jitter=False)
                
                # Should have failures
                assert summary['failed_stages'] > 0
                
            finally:
                os.chdir(original_cwd)
    
    @patch('orion.automate.run_pipeline.client')
    @patch('orion.automate.run_pipeline.load_site_config')
    @patch('orion.automate.run_pipeline.generate_topics_for_site')
    def test_run_pipeline_no_publish(self, mock_generate_topics, mock_load_config, mock_client):
        """Test pipeline with publishing disabled."""
        
        mock_site_config = Mock()
        mock_site_config.has_wordpress_config = True
        mock_site_config.topic_count = 1
        mock_site_config.topic_count_range = (1, 1)
        mock_site_config.enrich_prompt_strategy = 'default'
        mock_load_config.return_value = mock_site_config
        
        mock_client.health_check.return_value = {'ok': True}
        mock_client.ensure_week.return_value = {
            'id': 'week123',
            'isoWeek': '2024-W10'
        }
        mock_client.get_site_by_key.return_value = {
            'id': 'site123',
            'name': 'Test Site'
        }
        mock_client.bulk_create_topics.return_value = {'count': 2}
        mock_client.job_run_start.return_value = None  # Skip job tracking in tests
        mock_client.job_run_finish.return_value = None
        
        mock_topics = [
            {'siteId': 'site123', 'categoryId': 'cat1', 'title': 'Topic 1'}
        ]
        mock_generate_topics.return_value = mock_topics
        
        with tempfile.TemporaryDirectory() as temp_dir:
            original_cwd = os.getcwd()
            os.chdir(temp_dir)
            
            try:
                summary = run_pipeline('test-site', publish=False, enable_jitter=False)
                
                # Should succeed without WordPress calls
                assert summary['failed_stages'] == 0
                
            finally:
                os.chdir(original_cwd)


class TestPipelineCLI:
    """Test suite for CLI interface."""
    
    @patch('orion.automate.run_pipeline.run_pipeline')
    def test_main_cli_success(self, mock_run_pipeline):
        """Test successful CLI execution."""
        
        mock_run_pipeline.return_value = {
            'failed_stages': 0,
            'total_stages': 5,
            'success_rate': 1.0,
            'duration_minutes': 2.5
        }
        
        # Mock sys.argv
        test_args = ['run_pipeline.py', '--site-key', 'test-site', '--topics', '3']
        with patch('sys.argv', test_args):
            result = main()
        
        assert result == 0
        mock_run_pipeline.assert_called_once_with(
            site_key='test-site',
            topic_count=3,
            publish=True,
            dry_run_wp=None
        )
    
    @patch('orion.automate.run_pipeline.run_pipeline')
    def test_main_cli_with_failures(self, mock_run_pipeline):
        """Test CLI with pipeline failures."""
        
        mock_run_pipeline.return_value = {
            'failed_stages': 2,
            'total_stages': 5,
            'success_rate': 0.6,
            'duration_minutes': 1.2
        }
        
        test_args = ['run_pipeline.py', '--site-key', 'test-site']
        with patch('sys.argv', test_args):
            result = main()
        
        assert result == 1  # Should exit with error code
    
    def test_main_cli_missing_required_arg(self):
        """Test CLI with missing required argument."""
        
        test_args = ['run_pipeline.py', '--topics', '5']  # Missing --site-key
        
        with patch('sys.argv', test_args):
            with pytest.raises(SystemExit):
                main()


class TestEnhancedFeatures:
    """Test suite for new enhancement features."""
    
    def test_parse_topic_count_range_single(self):
        """Test parsing single topic count."""
        result = parse_topic_count_range("5")
        assert result == (5, 5)
    
    def test_parse_topic_count_range_range(self):
        """Test parsing topic count range.""" 
        result = parse_topic_count_range("3-7")
        assert result == (3, 7)
    
    def test_parse_topic_count_range_invalid_swaps(self):
        """Test parsing invalid range (max < min)."""
        result = parse_topic_count_range("8-3")
        assert result == (3, 8)  # Should swap values
    
    def test_parse_topic_count_range_invalid_format(self):
        """Test parsing invalid format falls back to default."""
        result = parse_topic_count_range("invalid")
        assert result == (5, 5)  # Default fallback
    
    def test_site_config_enhanced_fields(self):
        """Test enhanced SiteConfig fields."""
        config = SiteConfig(
            site_key="test",
            topic_count_range=(3, 7),
            enrich_prompt_strategy="random"
        )
        assert config.topic_count_range == (3, 7)
        assert config.enrich_prompt_strategy == "random"
    
    def test_get_available_prompts(self):
        """Test getting available prompt files."""
        prompts = get_available_prompts()
        # Should find our created prompt files
        expected_prompts = [
            "listicle_prompt.txt",
            "how_to_guide_prompt.txt", 
            "analysis_prompt.txt",
            "interview_prompt.txt",
            "case_study_prompt.txt"
        ]
        for prompt in expected_prompts:
            assert prompt in prompts
    
    def test_load_prompt_template_default(self):
        """Test loading default (template-based) prompt."""
        content, name = load_prompt_template("default")
        assert content == ""
        assert name == "template-based"
    
    def test_load_prompt_template_specific(self):
        """Test loading specific prompt file."""
        content, name = load_prompt_template("listicle_prompt.txt")
        assert len(content) > 0  # Should have content
        assert name == "listicle_prompt.txt"
        assert "listicle" in content.lower()
    
    def test_load_prompt_template_random(self):
        """Test loading random prompt."""
        content, name = load_prompt_template("random")
        assert len(content) > 0 or name == "template-based"  # Either found content or fell back
        assert name.endswith(".txt") or name == "template-based"
    
    def test_generate_post_with_new_format(self):
        """Test generate_post returns new format with metadata."""
        topic = {
            'title': 'AI Revolution — Machine Learning',
            'angle': 'Exploring ML in enterprise',
            'score': 0.8
        }
        
        result = generate_post(topic, 'default')
        
        # Should have both post_data and metadata
        assert 'post_data' in result
        assert 'metadata' in result
        
        post_data = result['post_data']
        metadata = result['metadata']
        
        # Validate post_data structure
        assert post_data['title'] == 'AI Revolution — Machine Learning'
        assert post_data['status'] == 'draft'
        assert 'content' in post_data
        assert 'categories' in post_data
        
        # Validate metadata structure
        assert 'prompt_used' in metadata
        assert 'llm_model' in metadata
        assert 'input_tokens' in metadata
        assert 'output_tokens' in metadata
        assert 'estimated_cost' in metadata
        
        # For template-based, should be zeros
        assert metadata['input_tokens'] == 0
        assert metadata['output_tokens'] == 0
        assert metadata['estimated_cost'] == 0.0
    
    def test_generate_post_with_prompt_strategy(self):
        """Test generate_post with different prompt strategies."""
        topic = {
            'title': 'Tech Analysis — Cloud Computing Trends',
            'angle': 'Market analysis of cloud adoption',
            'score': 0.9
        }
        
        # Test with specific prompt
        result = generate_post(topic, 'analysis_prompt.txt')
        
        assert 'post_data' in result
        assert 'metadata' in result
        
        metadata = result['metadata']
        assert metadata['prompt_used'] in ['analysis_prompt.txt', 'template-based']  # Could fall back


class TestJitterFunctionality:
    """Test suite for publishing jitter features."""
    
    @patch('orion.automate.run_pipeline.time.sleep')
    @patch('orion.automate.run_pipeline.random.randint')
    @patch('orion.automate.run_pipeline.load_site_config')
    @patch('orion.automate.run_pipeline.client')
    def test_jitter_applied(self, mock_client, mock_load_config, mock_randint, mock_sleep):
        """Test that jitter is applied when enabled."""
        mock_randint.return_value = 120  # Mock 2-minute jitter
        
        # Mock minimal config
        mock_site_config = Mock()
        mock_site_config.has_wordpress_config = False
        mock_site_config.topic_count = 5
        mock_site_config.topic_count_range = (5, 5)
        mock_site_config.enrich_prompt_strategy = 'default'
        mock_load_config.return_value = mock_site_config
        
        # Mock API failure to exit early
        from orion.api_client import OrionAPIError
        mock_client.health_check.side_effect = OrionAPIError("test exit")
        mock_client.job_run_start.return_value = None
        
        with tempfile.TemporaryDirectory() as temp_dir:
            original_cwd = os.getcwd()
            os.chdir(temp_dir)
            
            try:
                run_pipeline('test-site', enable_jitter=True)
            except:
                pass  # Expected to fail due to mocked API error
            finally:
                os.chdir(original_cwd)
        
        # Verify jitter was applied
        mock_randint.assert_called_with(0, 180)
        mock_sleep.assert_called_with(120)
    
    @patch('orion.automate.run_pipeline.time.sleep')
    @patch('orion.automate.run_pipeline.load_site_config')  
    @patch('orion.automate.run_pipeline.client')
    def test_jitter_disabled(self, mock_client, mock_load_config, mock_sleep):
        """Test that jitter can be disabled."""
        
        # Mock minimal config
        mock_site_config = Mock()
        mock_site_config.has_wordpress_config = False
        mock_site_config.topic_count = 5
        mock_site_config.topic_count_range = (5, 5) 
        mock_site_config.enrich_prompt_strategy = 'default'
        mock_load_config.return_value = mock_site_config
        
        # Mock API failure to exit early
        from orion.api_client import OrionAPIError
        mock_client.health_check.side_effect = OrionAPIError("test exit")
        mock_client.job_run_start.return_value = None
        
        with tempfile.TemporaryDirectory() as temp_dir:
            original_cwd = os.getcwd()
            os.chdir(temp_dir)
            
            try:
                run_pipeline('test-site', enable_jitter=False)
            except:
                pass  # Expected to fail due to mocked API error
            finally:
                os.chdir(original_cwd)
        
        # Verify no sleep was called
        mock_sleep.assert_not_called()


class TestTopicCountRange:
    """Test suite for topic count range functionality."""
    
    @patch.dict(os.environ, {'TOPIC_COUNT': '3-7'})
    def test_site_config_loads_range(self):
        """Test that site config properly loads topic count ranges."""
        config = load_site_config('test-site')
        
        assert config.topic_count_range == (3, 7)
        assert config.topic_count == 3  # Backward compatibility (min value)
    
    @patch.dict(os.environ, {'TOPIC_COUNT__test_site': '10-15'})
    def test_site_specific_topic_range(self):
        """Test site-specific topic count ranges."""
        config = load_site_config('test-site')
        
        assert config.topic_count_range == (10, 15)
    
    @patch.dict(os.environ, {'ENRICH_PROMPT_STRATEGY': 'random'})
    def test_global_prompt_strategy(self):
        """Test global prompt strategy configuration."""
        config = load_site_config('test-site')
        
        assert config.enrich_prompt_strategy == 'random'
    
    @patch.dict(os.environ, {'ENRICH_PROMPT_STRATEGY__test_site': 'listicle_prompt.txt'})
    def test_site_specific_prompt_strategy(self):
        """Test site-specific prompt strategy."""
        config = load_site_config('test-site')
        
        assert config.enrich_prompt_strategy == 'listicle_prompt.txt'


class TestIntegration:
    """Integration tests for pipeline components."""
    
    @patch.dict(os.environ, {
        'ORION_SITES': 'site1,site2',
        'WP_BASE_URL': 'https://test.com',
        'WP_USERNAME': 'user',
        'WP_APP_PASSWORD': 'pass',
        'TOPIC_COUNT': '3-5',
        'ENRICH_PROMPT_STRATEGY': 'random'
    })
    def test_multisite_validation_integration_enhanced(self):
        """Test multi-site validation with enhanced configuration."""
        
        site_configs = validate_multisite_setup()
        
        assert len(site_configs) == 2
        assert 'site1' in site_configs
        assert 'site2' in site_configs
        
        for config in site_configs.values():
            assert config.has_wordpress_config is True
            assert config.wp_base_url == 'https://test.com'
            assert config.topic_count_range == (3, 5)
            assert config.enrich_prompt_strategy == 'random'
    
    @patch.dict(os.environ, {
        'ORION_SITES': 'site1,site2',
        'WP_BASE_URL': 'https://test.com',
        'WP_USERNAME': 'user',
        'WP_APP_PASSWORD': 'pass'
    })
    def test_multisite_validation_integration_original(self):
        """Test multi-site validation with original environment variables (backward compatibility)."""
        
        site_configs = validate_multisite_setup()
        
        assert len(site_configs) == 2
        assert 'site1' in site_configs
        assert 'site2' in site_configs
        
        for config in site_configs.values():
            assert config.has_wordpress_config is True
            assert config.wp_base_url == 'https://test.com'
            # Should use defaults when not specified
            assert config.topic_count_range == (5, 5)
            assert config.enrich_prompt_strategy == 'default'
