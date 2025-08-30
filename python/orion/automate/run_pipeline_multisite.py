

"""
Multi-site automation pipeline for Orion Content Management System - Phase 5.

This enhanced pipeline runner handles multiple sites in parallel or sequential mode,
with proper isolation and comprehensive logging per site.
"""

import argparse
import asyncio
import json
import logging
import os
import random
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

from ..api_client import client, OrionAPIError
from ..gather_trends import generate_topics_for_site
from ..publish.publisher_wp import WordPressPublisher
from .multisite import load_site_config, get_site_list, apply_site_config_to_env
from .enrich import generate_post
from .run_pipeline import run_pipeline as run_single_site_pipeline, PipelineLogger

logger = logging.getLogger(__name__)


class MultiSitePipelineRunner:
    """Orchestrates pipeline execution across multiple sites."""
    
    def __init__(self, sites: Optional[List[str]] = None, parallel: bool = True, max_workers: int = 3):
        self.sites = sites or get_site_list()
        self.parallel = parallel
        self.max_workers = max_workers
        self.results: Dict[str, Dict[str, Any]] = {}
        
        # Global pipeline logger
        self.start_time = datetime.now(timezone.utc)
        self.global_log_dir = Path("automation-logs") / "multisite"
        self.global_log_dir.mkdir(parents=True, exist_ok=True)
        
        today = self.start_time.strftime("%Y-%m-%d")
        self.global_log_file = self.global_log_dir / f"{today}.jsonl"
    
    def log_global_event(self, event_type: str, ok: bool, **extra_data):
        """Log a global multi-site event."""
        event = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "ok": ok,
            **extra_data
        }
        
        # Write to global log file
        with open(self.global_log_file, "a") as f:
            f.write(json.dumps(event) + "\n")
        
        # Also log to standard logger
        level = logging.INFO if ok else logging.ERROR
        logger.log(level, f"[GLOBAL {event_type}] {extra_data}")
    
    def run_all_sites(self, topic_count: Optional[int] = None, publish: bool = True, 
                     dry_run_wp: Optional[bool] = None, 
                     jitter_sleep: bool = True) -> Dict[str, Any]:
        """
        Run pipeline across all configured sites.
        
        Args:
            topic_count: Override topic count for all sites (None = use site config)
            publish: Whether to create WordPress drafts
            dry_run_wp: Force WordPress dry run mode
            jitter_sleep: Add random delay before starting pipeline
            
        Returns:
            Summary of multi-site execution
        """
        
        logger.info(f"Starting multi-site pipeline for {len(self.sites)} sites")
        self.log_global_event("multisite_start", True, 
                             sites=self.sites, 
                             parallel=self.parallel,
                             max_workers=self.max_workers if self.parallel else 1)
        
        # Optional jitter delay (0-180 seconds) for natural timing
        if jitter_sleep and len(self.sites) > 1:
            delay = random.randint(0, 180)
            logger.info(f"Adding jitter delay: {delay} seconds")
            time.sleep(delay)
        
        try:
            if self.parallel and len(self.sites) > 1:
                return self._run_parallel(topic_count, publish, dry_run_wp)
            else:
                return self._run_sequential(topic_count, publish, dry_run_wp)
        except Exception as e:
            logger.error(f"Multi-site pipeline failed: {e}")
            self.log_global_event("multisite_failed", False, error=str(e))
            raise
    
    def _run_sequential(self, topic_count: Optional[int], publish: bool, 
                       dry_run_wp: Optional[bool]) -> Dict[str, Any]:
        """Run sites sequentially."""
        
        for site_key in self.sites:
            try:
                logger.info(f"\n{'='*50}")
                logger.info(f"Processing Site: {site_key}")
                logger.info(f"{'='*50}")
                
                result = self._run_site(site_key, topic_count, publish, dry_run_wp)
                self.results[site_key] = result
                
                logger.info(f"✅ Site {site_key} completed: "
                          f"{result['failed_stages']}/{result['total_stages']} stages failed")
                
            except Exception as e:
                logger.error(f"❌ Site {site_key} failed: {e}")
                self.results[site_key] = {
                    "site": site_key,
                    "total_stages": 0,
                    "failed_stages": 1,
                    "success_rate": 0.0,
                    "duration_minutes": 0,
                    "error": str(e)
                }
        
        return self._generate_summary()
    
    def _run_parallel(self, topic_count: Optional[int], publish: bool, 
                     dry_run_wp: Optional[bool]) -> Dict[str, Any]:
        """Run sites in parallel using ThreadPoolExecutor."""
        
        logger.info(f"Running {len(self.sites)} sites in parallel (max workers: {self.max_workers})")
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all site jobs
            future_to_site = {
                executor.submit(self._run_site, site_key, topic_count, publish, dry_run_wp): site_key 
                for site_key in self.sites
            }
            
            # Process completed jobs
            for future in as_completed(future_to_site):
                site_key = future_to_site[future]
                try:
                    result = future.result()
                    self.results[site_key] = result
                    logger.info(f"✅ Site {site_key} completed: "
                              f"{result['failed_stages']}/{result['total_stages']} stages failed")
                except Exception as e:
                    logger.error(f"❌ Site {site_key} failed: {e}")
                    self.results[site_key] = {
                        "site": site_key,
                        "total_stages": 0,
                        "failed_stages": 1,
                        "success_rate": 0.0,
                        "duration_minutes": 0,
                        "error": str(e)
                    }
        
        return self._generate_summary()
    
    def _run_site(self, site_key: str, topic_count: Optional[int], 
                 publish: bool, dry_run_wp: Optional[bool]) -> Dict[str, Any]:
        """
        Run pipeline for a single site with proper isolation.
        
        Args:
            site_key: Site identifier
            topic_count: Override topic count (None = use site config)
            publish: Whether to create WordPress drafts
            dry_run_wp: Force WordPress dry run mode
            
        Returns:
            Pipeline execution summary for the site
        """
        
        # Load site-specific configuration
        site_config = load_site_config(site_key)
        
        # Apply site config to environment for this thread
        apply_site_config_to_env(site_config)
        
        # Determine final topic count
        if topic_count is not None:
            final_topic_count = topic_count
        else:
            # Use site's configured topic count (handle ranges)
            min_count, max_count = site_config.get_topic_count_range()
            final_topic_count = random.randint(min_count, max_count) if min_count != max_count else min_count
        
        logger.info(f"Site {site_key}: Using {final_topic_count} topics, "
                   f"strategy={site_config.enrich_prompt_strategy}")
        
        # Run the single-site pipeline
        return run_single_site_pipeline(
            site_key=site_key,
            topic_count=final_topic_count,
            publish=publish,
            dry_run_wp=dry_run_wp
        )
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate comprehensive multi-site summary."""
        
        total_sites = len(self.results)
        successful_sites = sum(1 for result in self.results.values() 
                             if result.get('failed_stages', 1) == 0)
        failed_sites = total_sites - successful_sites
        
        # Aggregate statistics
        total_stages = sum(result.get('total_stages', 0) for result in self.results.values())
        total_failed_stages = sum(result.get('failed_stages', 0) for result in self.results.values())
        total_duration = sum(result.get('duration_minutes', 0) for result in self.results.values())
        avg_duration = total_duration / total_sites if total_sites > 0 else 0
        
        # Calculate overall success rate
        overall_success_rate = (total_sites - failed_sites) / total_sites if total_sites > 0 else 0
        
        summary = {
            "multisite_execution": {
                "total_sites": total_sites,
                "successful_sites": successful_sites,
                "failed_sites": failed_sites,
                "success_rate": overall_success_rate,
                "parallel_execution": self.parallel,
                "total_duration_minutes": (datetime.now(timezone.utc) - self.start_time).total_seconds() / 60
            },
            "aggregate_stats": {
                "total_pipeline_stages": total_stages,
                "total_failed_stages": total_failed_stages,
                "average_site_duration_minutes": avg_duration
            },
            "site_results": self.results,
            "log_files": {
                "global_log": str(self.global_log_file),
                "site_logs": [result.get('log_file') for result in self.results.values() 
                            if 'log_file' in result]
            }
        }
        
        # Log final summary
        self.log_global_event("multisite_complete", failed_sites == 0,
                             **summary["multisite_execution"],
                             **summary["aggregate_stats"])
        
        return summary


def main():
    """CLI entry point for multi-site automation pipeline."""
    parser = argparse.ArgumentParser(
        description='Multi-site automated publishing pipeline for Orion Content',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run all configured sites in parallel
  python -m orion.automate.run_pipeline_multisite
  
  # Run specific sites sequentially
  python -m orion.automate.run_pipeline_multisite --sites travel,finance --sequential
  
  # Run with specific topic count override
  python -m orion.automate.run_pipeline_multisite --topics 10
  
  # Dry-run mode (no WordPress publishing)
  python -m orion.automate.run_pipeline_multisite --publish 0
  
  # Force WordPress dry-run even if configured
  python -m orion.automate.run_pipeline_multisite --dry-run-wp 1
        """
    )
    
    parser.add_argument('--sites', 
                       help='Comma-separated list of sites to run (default: all configured)')
    parser.add_argument('--topics', type=int,
                       help='Topic count override for all sites (ignores site-specific configs)')
    parser.add_argument('--publish', type=int, choices=[0, 1], default=1,
                       help='Create WordPress drafts: 0=no, 1=yes (default: 1)')
    parser.add_argument('--dry-run-wp', type=int, choices=[0, 1],
                       help='Force WordPress dry-run: 0=no, 1=yes (default: auto-detect)')
    parser.add_argument('--sequential', action='store_true',
                       help='Run sites sequentially instead of parallel')
    parser.add_argument('--max-workers', type=int, default=3,
                       help='Max parallel workers (default: 3)')
    parser.add_argument('--no-jitter', action='store_true',
                       help='Skip random startup delay')
    
    args = parser.parse_args()
    
    try:
        # Parse sites list
        sites = None
        if args.sites:
            sites = [site.strip() for site in args.sites.split(',') if site.strip()]
        
        # Convert numeric args to boolean
        publish = bool(args.publish)
        dry_run_wp = bool(args.dry_run_wp) if args.dry_run_wp is not None else None
        
        # Create and run multi-site pipeline
        runner = MultiSitePipelineRunner(
            sites=sites,
            parallel=not args.sequential,
            max_workers=args.max_workers
        )
        
        summary = runner.run_all_sites(
            topic_count=args.topics,
            publish=publish,
            dry_run_wp=dry_run_wp,
            jitter_sleep=not args.no_jitter
        )
        
        # Print final summary for CI/CD
        multisite_stats = summary["multisite_execution"]
        aggregate_stats = summary["aggregate_stats"]
        
        print(f"\n{'='*60}")
        print("MULTI-SITE PIPELINE SUMMARY")
        print(f"{'='*60}")
        print(f"Sites processed: {multisite_stats['total_sites']}")
        print(f"Successful sites: {multisite_stats['successful_sites']}")
        print(f"Failed sites: {multisite_stats['failed_sites']}")
        print(f"Success rate: {multisite_stats['success_rate']:.1%}")
        print(f"Execution mode: {'Parallel' if multisite_stats['parallel_execution'] else 'Sequential'}")
        print(f"Total duration: {multisite_stats['total_duration_minutes']:.1f}m")
        print(f"Average per site: {aggregate_stats['average_site_duration_minutes']:.1f}m")
        print(f"Pipeline stages failed: {aggregate_stats['total_failed_stages']}/{aggregate_stats['total_pipeline_stages']}")
        
        # Site-by-site summary
        print(f"\nPer-Site Results:")
        for site_key, result in summary["site_results"].items():
            status = "✅" if result.get('failed_stages', 1) == 0 else "❌"
            stages = f"{result.get('failed_stages', 'N/A')}/{result.get('total_stages', 'N/A')}"
            duration = f"{result.get('duration_minutes', 0):.1f}m"
            print(f"  {status} {site_key}: {stages} failed stages, {duration}")
        
        # Exit with error code if any sites failed
        return 1 if multisite_stats['failed_sites'] > 0 else 0
        
    except KeyboardInterrupt:
        logger.info("Multi-site pipeline interrupted by user")
        return 130
    except Exception as e:
        logger.error(f"Multi-site pipeline failed: {e}")
        return 1


if __name__ == '__main__':
    exit(main())

