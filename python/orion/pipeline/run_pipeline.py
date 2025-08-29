

"""
Phase 7: Enhanced Pipeline Runner with Quality Gating

This module orchestrates the complete content generation pipeline:
1. Multi-stage generation (outline → sections → E-E-A-T)
2. Quality assessment
3. Human-in-the-loop gating
4. WordPress publishing with quality tags
"""

import logging
import json
import time
from typing import Dict, Any, Optional
import os
import sys

# Add the parent directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from orion.config import config
from orion.api_client import client
from orion.enrich import generate_outline, write_sections, enrich_for_eeat
from orion.quality.checker import check_quality
from orion.publish.publisher_wp import WordPressPublisher

logger = logging.getLogger(__name__)


class PipelineRunner:
    """Orchestrates the complete content generation and quality pipeline."""
    
    def __init__(self):
        self.wp_publisher = WordPressPublisher() if config.has_wordpress_config else None
        
    def run_complete_pipeline(self, site_key: str, topic_id: str, 
                            publish: bool = True) -> Dict[str, Any]:
        """
        Run the complete Phase 7 pipeline for a single topic.
        
        Args:
            site_key: Site identifier
            topic_id: Topic to process
            publish: Whether to publish to WordPress
            
        Returns:
            Pipeline execution results with metrics
        """
        pipeline_start = time.time()
        logger.info(f"Starting Phase 7 pipeline for topic {topic_id} on site {site_key}")
        
        try:
            # 1. Load topic and site configuration
            topic_data = self._load_topic(topic_id)
            site_strategy = self._load_site_strategy(site_key)
            global_rulebook = self._load_global_rulebook()
            
            # 2. Check for rulebook override
            override_rulebook = topic_data.get('flags', {}).get('ignore_rulebook', False)
            if override_rulebook:
                logger.info(f"Rulebook enforcement skipped for topic {topic_id} (ignore_rulebook=true)")
            
            # 3. Stage 1: Generate Outline
            logger.info("Stage 1: Generating content outline")
            outline_result = generate_outline(topic_data, site_strategy, global_rulebook, override_rulebook)
            
            # 4. Stage 2: Write Sections
            logger.info("Stage 2: Writing content sections")
            draft_result = write_sections(outline_result, site_strategy, global_rulebook)
            
            # 5. Stage 3: E-E-A-T Enrichment
            logger.info("Stage 3: Applying E-E-A-T enrichment")
            final_content = enrich_for_eeat(draft_result, site_strategy, global_rulebook)
            
            # 6. Quality Assessment
            logger.info("Stage 4: Quality assessment")
            quality_result = check_quality(
                article_text=final_content['content'],
                metadata={
                    'title': final_content['title'],
                    'meta_description': final_content['meta_description']
                },
                primary_keyword=draft_result.get('primary_keyword', ''),
                strategy=site_strategy,
                rulebook=global_rulebook
            )
            
            # 7. Human-in-the-Loop Gating
            logger.info("Stage 5: Quality gating and publishing decision")
            publish_decision = self._make_publish_decision(quality_result, global_rulebook)
            
            # 8. WordPress Publishing (if enabled and decided)
            wordpress_result = None
            if publish and self.wp_publisher:
                wordpress_result = self._publish_to_wordpress(
                    final_content, 
                    quality_result, 
                    publish_decision
                )
            elif publish:
                logger.warning("WordPress publishing requested but not configured")
            
            # 9. Record Job Metrics
            pipeline_end = time.time()
            job_metadata = self._create_job_metadata(
                outline_result, draft_result, final_content, quality_result,
                publish_decision, wordpress_result, pipeline_start, pipeline_end
            )
            
            # 10. Update Job Run Record
            self._update_job_run(topic_id, job_metadata, True)
            
            logger.info(f"Pipeline completed successfully for topic {topic_id}")
            
            return {
                "success": True,
                "topic_id": topic_id,
                "site_key": site_key,
                "quality_score": quality_result['score'],
                "quality_passed": quality_result['enforcement']['passed'],
                "published": wordpress_result is not None and wordpress_result.get('success', False),
                "wordpress_result": wordpress_result,
                "pipeline_metrics": job_metadata,
                "final_content": final_content
            }
            
        except Exception as e:
            logger.error(f"Pipeline failed for topic {topic_id}: {str(e)}")
            pipeline_end = time.time()
            
            error_metadata = {
                "error": str(e),
                "pipeline_duration_ms": int((pipeline_end - pipeline_start) * 1000),
                "failed_stage": "unknown"
            }
            
            self._update_job_run(topic_id, error_metadata, False)
            
            return {
                "success": False,
                "topic_id": topic_id,
                "error": str(e),
                "pipeline_metrics": error_metadata
            }
    
    def _load_topic(self, topic_id: str) -> Dict[str, Any]:
        """Load topic data from API."""
        try:
            response = client.session.get(f"{config.orion_base_url}/api/topics/{topic_id}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to load topic {topic_id}: {e}")
            # Return minimal topic for testing
            return {
                "id": topic_id,
                "title": "Test Topic",
                "angle": "Test angle for topic",
                "score": 0.8,
                "flags": {}
            }
    
    def _load_site_strategy(self, site_key: str) -> Dict[str, Any]:
        """Load site strategy from API."""
        try:
            # First get site ID from site key
            sites_response = client.session.get(f"{config.orion_base_url}/api/sites")
            sites_response.raise_for_status()
            sites = sites_response.json()
            
            site_id = None
            for site in sites:
                if site.get('key') == site_key:
                    site_id = site['id']
                    break
            
            if not site_id:
                logger.warning(f"Site {site_key} not found, using empty strategy")
                return {}
            
            # Get site strategy
            strategy_response = client.session.get(f"{config.orion_base_url}/api/sites/{site_id}/strategy")
            strategy_response.raise_for_status()
            return strategy_response.json()
            
        except Exception as e:
            logger.warning(f"Failed to load site strategy for {site_key}: {e}")
            return {}
    
    def _load_global_rulebook(self) -> Dict[str, Any]:
        """Load global rulebook from API."""
        try:
            response = client.session.get(f"{config.orion_base_url}/api/rulebook")
            response.raise_for_status()
            rulebook_data = response.json()
            return rulebook_data.get('rules', {})
        except Exception as e:
            logger.warning(f"Failed to load global rulebook: {e}")
            # Return default rulebook
            return {
                "eeat": {"require_citations": True, "require_author_bio": True},
                "seo": {"internal_links_min": 2, "outbound_links_min": 1},
                "enforcement": {"default_min_quality_score": 80, "tag_if_below": "review-needed"}
            }
    
    def _make_publish_decision(self, quality_result: Dict[str, Any], 
                             rulebook: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make publishing decision based on quality score and enforcement rules.
        
        Returns:
            Decision metadata with action and tags
        """
        score = quality_result['score']
        enforcement = quality_result['enforcement']
        passed = enforcement['passed']
        threshold = enforcement['threshold']
        
        # Check if blocking is enabled
        enforcement_rules = rulebook.get('enforcement', {})
        block_below = enforcement_rules.get('block_publish_if_below', False)
        tag_below = enforcement_rules.get('tag_if_below', 'review-needed')
        
        if passed:
            return {
                "action": "publish",
                "reason": f"Quality score ({score}) meets threshold ({threshold})",
                "tags": [],
                "status": "approved"
            }
        elif block_below:
            return {
                "action": "block",
                "reason": f"Quality score ({score}) below threshold ({threshold}) and blocking enabled",
                "tags": [tag_below],
                "status": "blocked"
            }
        else:
            return {
                "action": "publish_with_review_tag",
                "reason": f"Quality score ({score}) below threshold ({threshold}), publishing with review tag",
                "tags": [tag_below],
                "status": "needs_review"
            }
    
    def _publish_to_wordpress(self, content: Dict[str, Any], 
                            quality_result: Dict[str, Any],
                            decision: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Publish content to WordPress with appropriate tags.
        """
        if decision['action'] == 'block':
            logger.info("Publishing blocked due to quality score")
            return {
                "success": False,
                "reason": "blocked",
                "message": decision['reason']
            }
        
        try:
            # Prepare WordPress post data
            post_data = {
                "title": content['title'],
                "content": content['content'],
                "status": "draft",  # Always start as draft
                "meta_description": content.get('meta_description', ''),
                "categories": [],
                "tags": decision.get('tags', [])
            }
            
            # Add quality metadata as custom fields
            post_data["custom_fields"] = {
                "orion_quality_score": quality_result['score'],
                "orion_quality_breakdown": json.dumps(quality_result['breakdown']),
                "orion_generation_method": "phase7_pipeline"
            }
            
            # Publish via WordPress API
            result = self.wp_publisher.create_post(post_data)
            
            if result.get('success'):
                logger.info(f"Successfully published to WordPress: {result.get('post_id')}")
                
                # Add quality tags if needed
                if decision.get('tags'):
                    self._add_wordpress_tags(result['post_id'], decision['tags'])
                
                return {
                    "success": True,
                    "post_id": result['post_id'],
                    "post_url": result.get('post_url'),
                    "quality_tags": decision.get('tags', []),
                    "status": decision['status']
                }
            else:
                logger.error(f"WordPress publishing failed: {result.get('error')}")
                return {
                    "success": False,
                    "error": result.get('error'),
                    "reason": "wordpress_api_error"
                }
                
        except Exception as e:
            logger.error(f"WordPress publishing exception: {e}")
            return {
                "success": False,
                "error": str(e),
                "reason": "publishing_exception"
            }
    
    def _add_wordpress_tags(self, post_id: str, tags: List[str]) -> None:
        """Add tags to WordPress post."""
        try:
            if self.wp_publisher:
                self.wp_publisher.add_tags(post_id, tags)
        except Exception as e:
            logger.warning(f"Failed to add tags {tags} to post {post_id}: {e}")
    
    def _create_job_metadata(self, outline_result: Dict[str, Any], 
                           draft_result: Dict[str, Any],
                           final_content: Dict[str, Any],
                           quality_result: Dict[str, Any],
                           publish_decision: Dict[str, Any],
                           wordpress_result: Optional[Dict[str, Any]],
                           start_time: float, end_time: float) -> Dict[str, Any]:
        """Create comprehensive job metadata."""
        
        # Collect all generation costs
        total_cost = 0.0
        total_tokens = 0
        
        for stage_result in [outline_result, draft_result, final_content]:
            stage_metrics = stage_result.get('metadata', {}).get('metrics', {})
            total_cost += stage_metrics.get('cost_usd', 0.0)
            total_tokens += stage_metrics.get('tokens', 0)
        
        return {
            "pipeline_version": "phase7",
            "stages_completed": 5,
            "pipeline_duration_ms": int((end_time - start_time) * 1000),
            "generation_metrics": {
                "total_cost_usd": round(total_cost, 4),
                "total_tokens": total_tokens,
                "outline_tokens": outline_result.get('metadata', {}).get('metrics', {}).get('tokens', 0),
                "sections_tokens": draft_result.get('metadata', {}).get('metrics', {}).get('tokens', 0),
                "eeat_tokens": final_content.get('metadata', {}).get('metrics', {}).get('tokens', 0)
            },
            "quality_metrics": {
                "final_score": quality_result['score'],
                "breakdown": quality_result['breakdown'],
                "issues_count": len(quality_result['issues']),
                "enforcement_passed": quality_result['enforcement']['passed']
            },
            "publishing": {
                "decision": publish_decision,
                "wordpress_success": wordpress_result.get('success') if wordpress_result else False,
                "wordpress_post_id": wordpress_result.get('post_id') if wordpress_result else None
            }
        }
    
    def _update_job_run(self, topic_id: str, metadata: Dict[str, Any], success: bool) -> None:
        """Update job run record in the database."""
        try:
            job_data = {
                "jobType": "phase7_pipeline",
                "startedAt": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                "endedAt": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                "ok": success,
                "notes": f"Phase 7 pipeline for topic {topic_id}",
                "metadata": metadata
            }
            
            response = client.session.post(f"{config.orion_base_url}/api/jobrun", json=job_data)
            response.raise_for_status()
            
        except Exception as e:
            logger.error(f"Failed to update job run record: {e}")


def main():
    """Command-line interface for pipeline runner."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Phase 7 Pipeline Runner")
    parser.add_argument("--site-key", required=True, help="Site key")
    parser.add_argument("--topic-id", required=True, help="Topic ID to process")
    parser.add_argument("--publish", type=int, default=1, help="Publish to WordPress (1/0)")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)
    
    runner = PipelineRunner()
    
    result = runner.run_complete_pipeline(
        site_key=args.site_key,
        topic_id=args.topic_id,
        publish=bool(args.publish)
    )
    
    if result['success']:
        print(f"✅ Pipeline completed successfully")
        print(f"Quality Score: {result['quality_score']}")
        print(f"Quality Passed: {result['quality_passed']}")
        print(f"Published: {result['published']}")
    else:
        print(f"❌ Pipeline failed: {result['error']}")
        sys.exit(1)


if __name__ == "__main__":
    main()
