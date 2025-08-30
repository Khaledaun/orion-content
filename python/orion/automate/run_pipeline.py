
"""
Automated publishing pipeline for Orion Content Management System.

This is the single entrypoint that DeepAgent will schedule for automated 
content generation and publishing across multiple sites.
"""

import argparse
import json
import logging
import os
import random
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional

from ..api_client import client, OrionAPIError
from ..gather_trends import generate_topics_for_site
from ..publish.publisher_wp import WordPressPublisher
from .multisite import load_site_config
from .enrich import generate_post

logger = logging.getLogger(__name__)


class PipelineLogger:
    """Structured logging for automation pipeline."""
    
    def __init__(self, site_key: str):
        self.site_key = site_key
        self.logs = []
        self.start_time = datetime.now(timezone.utc)
        
        # Ensure logs directory exists
        self.log_dir = Path("automation-logs") / site_key
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Log file name based on date
        today = self.start_time.strftime("%Y-%m-%d")
        self.log_file = self.log_dir / f"{today}.jsonl"
    
    def log_event(self, stage: str, ok: bool, **extra_data):
        """Log a pipeline event."""
        event = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "site": self.site_key,
            "stage": stage,
            "ok": ok,
            **extra_data
        }
        
        self.logs.append(event)
        
        # Write to file immediately for real-time monitoring
        with open(self.log_file, "a") as f:
            f.write(json.dumps(event) + "\n")
        
        # Also log to standard logger
        level = logging.INFO if ok else logging.ERROR
        logger.log(level, f"[{stage}] {extra_data}")
    
    def get_summary(self) -> Dict[str, Any]:
        """Get pipeline summary."""
        total_stages = len(self.logs)
        failed_stages = len([log for log in self.logs if not log["ok"]])
        
        return {
            "site": self.site_key,
            "total_stages": total_stages,
            "failed_stages": failed_stages,
            "success_rate": (total_stages - failed_stages) / total_stages if total_stages > 0 else 0,
            "duration_minutes": (datetime.now(timezone.utc) - self.start_time).total_seconds() / 60,
            "log_file": str(self.log_file)
        }


def deduplicate_topics(topics: List[Dict[str, Any]], existing_titles: set = None) -> List[Dict[str, Any]]:
    """Remove duplicate topics by title within batch."""
    if existing_titles is None:
        existing_titles = set()
    
    unique_topics = []
    seen_titles = existing_titles.copy()
    
    for topic in topics:
        title = topic.get("title", "")
        if title and title not in seen_titles:
            unique_topics.append(topic)
            seen_titles.add(title)
        else:
            logger.warning(f"Skipping duplicate topic: {title}")
    
    return unique_topics


def run_pipeline(site_key: str, topic_count: int = 5, publish: bool = True, 
                dry_run_wp: Optional[bool] = None, enable_jitter: bool = True) -> Dict[str, Any]:
    """
    Run the complete automation pipeline for a site.
    
    Args:
        site_key: Site identifier
        topic_count: Number of topics to generate (can be overridden by site config)
        publish: Whether to create WordPress drafts (0/1)
        dry_run_wp: Force WordPress dry run mode (if None, auto-detect)
        enable_jitter: Whether to add random timing jitter
    
    Returns:
        Pipeline execution summary
    """
    
    pipeline_log = PipelineLogger(site_key)
    job_run_id = None
    
    try:
        # Add random jitter to make automation appear more natural
        if enable_jitter:
            jitter_seconds = random.randint(0, 180)  # 0-3 minutes
            logger.info(f"Adding {jitter_seconds}s jitter for natural timing...")
            pipeline_log.log_event("jitter_applied", True, jitter_seconds=jitter_seconds)
            time.sleep(jitter_seconds)
        else:
            pipeline_log.log_event("jitter_skipped", True, reason="disabled")
        # Load site configuration
        logger.info(f"Starting pipeline for site: {site_key}")
        site_config = load_site_config(site_key)
        
        # Determine actual topic count using jitter (if range is specified)
        if site_config.topic_count_range[0] != site_config.topic_count_range[1]:
            # Use random count from range
            actual_topic_count = random.randint(site_config.topic_count_range[0], site_config.topic_count_range[1])
            logger.info(f"Using random topic count: {actual_topic_count} (from range {site_config.topic_count_range})")
        else:
            # Use either the passed parameter or site config default
            actual_topic_count = topic_count if topic_count != 5 else site_config.topic_count
            
        pipeline_log.log_event("config_loaded", True, 
                             has_wp_config=site_config.has_wordpress_config,
                             topic_count=actual_topic_count,
                             prompt_strategy=site_config.enrich_prompt_strategy)
        
        # Optional: Record job run start
        try:
            job_meta = {
                "site_key": site_key,
                "topic_count": topic_count,
                "publish_enabled": publish
            }
            job_run = client.job_run_start("automation_pipeline", job_meta)
            job_run_id = job_run.get("id") if job_run else None
            pipeline_log.log_event("job_start", True, job_run_id=job_run_id)
        except Exception as e:
            pipeline_log.log_event("job_start", False, error=str(e))
            # Continue even if job tracking fails
        
        # Step 1: Health check
        logger.info("Checking API health...")
        health = client.health_check()
        if not health.get('ok'):
            raise OrionAPIError("API health check failed")
        pipeline_log.log_event("health_check", True)
        
        # Step 2: Ensure current week exists
        logger.info("Ensuring current week exists...")
        week = client.ensure_week(site_key)
        pipeline_log.log_event("ensure_week", True, 
                             week=week["isoWeek"], week_id=week["id"])
        
        # Step 3: Get site data
        logger.info(f"Loading site data: {site_key}")
        site = client.get_site_by_key(site_key)
        if not site:
            raise OrionAPIError(f"Site not found: {site_key}")
        
        pipeline_log.log_event("site_loaded", True, 
                             site_id=site["id"], site_name=site.get("name"))
        
        # Step 4: Generate topics
        logger.info(f"Generating {actual_topic_count} topics...")
        generated_topics = generate_topics_for_site(site, actual_topic_count)
        
        if not generated_topics:
            pipeline_log.log_event("generate_topics", False, 
                                 error="No topics generated (site may have no categories)")
            return pipeline_log.get_summary()
        
        # Deduplicate topics (additional safety)
        unique_topics = deduplicate_topics(generated_topics)
        pipeline_log.log_event("generate_topics", True, 
                             generated=len(generated_topics), 
                             unique=len(unique_topics))
        
        # Step 5: Bulk create topics in API
        logger.info("Creating topics in Orion API...")
        bulk_result = client.bulk_create_topics(week["id"], unique_topics)
        created_count = bulk_result.get("count", 0)
        
        pipeline_log.log_event("create_topics", True, 
                             submitted=len(unique_topics),
                             created=created_count)
        
        # Step 6: WordPress publishing (if enabled)
        drafts_created = 0
        publish_errors = 0
        post_metadata_list = []
        
        if publish and unique_topics:
            logger.info("Starting WordPress publishing...")
            
            # Initialize WordPress publisher with site config
            wp_publisher = WordPressPublisher()
            
            # Apply site-specific WordPress configuration
            if not site_config.has_wordpress_config:
                logger.info("WordPress will run in dry-run mode (no credentials)")
            elif dry_run_wp:
                logger.info("WordPress dry-run mode forced")
                # Temporarily disable WP config for this run
                wp_publisher.config.wp_base_url = None
            
            # Process each topic for publishing
            for i, topic in enumerate(unique_topics):
                try:
                    logger.info(f"Publishing topic {i+1}/{len(unique_topics)}: {topic['title'][:50]}...")
                    
                    # Generate post content with metadata using site's prompt strategy
                    post_result = generate_post(topic, site_config.enrich_prompt_strategy)
                    post_data = post_result["post_data"]
                    metadata = post_result["metadata"]
                    
                    # Store metadata for logging
                    post_metadata_list.append(metadata)
                    
                    # Create WordPress draft
                    wp_result = wp_publisher.create_post(
                        title=post_data["title"],
                        content=post_data["content"],
                        status=post_data["status"],
                        categories=post_data.get("categories")
                    )
                    
                    if wp_result.get("id") != "dry-run":
                        drafts_created += 1
                    
                    logger.info(f"Created WordPress post: {wp_result.get('id')} using {metadata['prompt_used']}")
                    
                except Exception as e:
                    publish_errors += 1
                    logger.error(f"Failed to publish topic '{topic['title']}': {e}")
                    # Still track metadata for failed posts if available
                    try:
                        error_result = generate_post(topic, site_config.enrich_prompt_strategy)
                        post_metadata_list.append(error_result["metadata"])
                    except:
                        pass  # Don't let metadata collection cause additional errors
                    # Continue with other topics
            
            # Calculate aggregate metadata for logging
            total_input_tokens = sum(meta['input_tokens'] for meta in post_metadata_list)
            total_output_tokens = sum(meta['output_tokens'] for meta in post_metadata_list)
            total_estimated_cost = sum(meta['estimated_cost'] for meta in post_metadata_list)
            prompts_used = [meta['prompt_used'] for meta in post_metadata_list]
            
            pipeline_log.log_event("wordpress_publish", True,
                                 topics_processed=len(unique_topics),
                                 drafts_created=drafts_created,
                                 errors=publish_errors,
                                 dry_run=not site_config.has_wordpress_config or bool(dry_run_wp),
                                 # Metadata for cost/quality tracking
                                 total_input_tokens=total_input_tokens,
                                 total_output_tokens=total_output_tokens,
                                 estimated_cost=total_estimated_cost,
                                 prompts_used=prompts_used,
                                 prompt_strategy=site_config.enrich_prompt_strategy)
        else:
            pipeline_log.log_event("wordpress_publish", True, 
                                 skipped=True, 
                                 reason="publish=False or no topics")
        
        # Record job completion
        if job_run_id:
            try:
                client.job_run_finish(job_run_id, "success", {
                    "topics_created": created_count,
                    "drafts_created": drafts_created,
                    "errors": publish_errors
                })
                pipeline_log.log_event("job_finish", True, status="success")
            except Exception as e:
                pipeline_log.log_event("job_finish", False, error=str(e))
        
        logger.info(f"Pipeline completed successfully for {site_key}")
        logger.info(f"Summary: {created_count} topics created, {drafts_created} WordPress drafts")
        
        return pipeline_log.get_summary()
        
    except Exception as e:
        logger.error(f"Pipeline failed for {site_key}: {e}")
        pipeline_log.log_event("pipeline_failed", False, error=str(e))
        
        # Record job failure
        if job_run_id:
            try:
                client.job_run_finish(job_run_id, "failed", {"error": str(e)})
            except:
                pass  # Don't let job recording prevent error reporting
        
        return pipeline_log.get_summary()


def main():
    """CLI entry point for automation pipeline."""
    parser = argparse.ArgumentParser(
        description='Automated publishing pipeline for Orion Content',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single site with 5 topics
  python -m orion.automate.run_pipeline --site-key my-site --topics 5
  
  # Generate topics only (no WordPress publishing)
  python -m orion.automate.run_pipeline --site-key my-site --topics 10 --publish 0
  
  # Force WordPress dry-run
  python -m orion.automate.run_pipeline --site-key my-site --dry-run-wp 1
        """
    )
    
    parser.add_argument('--site-key', required=True,
                       help='Site key to run pipeline for')
    parser.add_argument('--topics', type=int, default=5,
                       help='Number of topics to generate (default: 5)')
    parser.add_argument('--publish', type=int, choices=[0, 1], default=1,
                       help='Create WordPress drafts: 0=no, 1=yes (default: 1)')
    parser.add_argument('--dry-run-wp', type=int, choices=[0, 1],
                       help='Force WordPress dry-run: 0=no, 1=yes (default: auto-detect)')
    parser.add_argument('--no-jitter', action='store_true',
                       help='Disable timing jitter (useful for testing)')
    
    args = parser.parse_args()
    
    try:
        # Convert numeric args to boolean
        publish = bool(args.publish)
        dry_run_wp = bool(args.dry_run_wp) if args.dry_run_wp is not None else None
        enable_jitter = not args.no_jitter
        
        # Run pipeline
        summary = run_pipeline(
            site_key=args.site_key,
            topic_count=args.topics,
            publish=publish,
            dry_run_wp=dry_run_wp,
            enable_jitter=enable_jitter
        )
        
        # Print final summary for CI/CD
        print(f"PIPELINE SUMMARY: {args.site_key} - {summary['failed_stages']}/{summary['total_stages']} stages failed, "
              f"{summary['success_rate']:.1%} success rate in {summary['duration_minutes']:.1f}m")
        
        # Exit with error code if pipeline had failures
        return 1 if summary['failed_stages'] > 0 else 0
        
    except KeyboardInterrupt:
        logger.info("Pipeline interrupted by user")
        return 130
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        return 1


if __name__ == '__main__':
    exit(main())
