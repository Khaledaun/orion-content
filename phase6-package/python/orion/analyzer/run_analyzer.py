
#!/usr/bin/env python3
"""
Strategic Site Analyzer CLI
Command-line interface for running site analysis.
"""

import argparse
import asyncio
import json
import logging
import sys
from typing import Dict, Any

from ..config import Config as OrionConfig
from .analyzer import SiteAnalyzer


def setup_logging(level: str = "INFO") -> None:
    """Setup logging configuration."""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Orion Strategic Site Analyzer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Analyze your own site
  python -m orion.analyzer.run_analyzer my-site https://yoursite.com

  # Competitor analysis
  python -m orion.analyzer.run_analyzer competitor https://competitor.com

  # Prospect analysis for outreach
  python -m orion.analyzer.run_analyzer prospect https://prospect.com

  # Save results to file
  python -m orion.analyzer.run_analyzer my-site https://yoursite.com --output results.json

  # Verbose logging
  python -m orion.analyzer.run_analyzer competitor https://competitor.com --log-level DEBUG
        """
    )
    
    parser.add_argument(
        "mode",
        choices=["my-site", "competitor", "prospect"],
        help="Analysis mode to run"
    )
    
    parser.add_argument(
        "target_url",
        help="URL to analyze"
    )
    
    parser.add_argument(
        "--output", "-o",
        help="Output file path (JSON format)"
    )
    
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging level"
    )
    
    parser.add_argument(
        "--format",
        default="pretty",
        choices=["pretty", "json"],
        help="Output format"
    )
    
    return parser.parse_args()


def format_pretty_output(results: Dict[str, Any]) -> str:
    """Format results for pretty console output."""
    output_lines = []
    
    # Header
    output_lines.append("=" * 60)
    output_lines.append(f"ORION STRATEGIC SITE ANALYZER")
    output_lines.append("=" * 60)
    output_lines.append(f"Mode: {results.get('mode', 'Unknown').upper()}")
    output_lines.append(f"Target: {results.get('target_url', 'Unknown')}")
    output_lines.append(f"Timestamp: {results.get('timestamp', 'Unknown')}")
    output_lines.append("")
    
    # Analysis results
    if 'analysis' in results:
        output_lines.append("ANALYSIS RESULTS:")
        output_lines.append("-" * 40)
        
        analysis = results['analysis']
        
        # SEO Analysis
        if 'seo_analysis' in analysis:
            seo = analysis['seo_analysis']
            output_lines.append("SEO Analysis:")
            output_lines.append(f"  Title: {seo.get('title', 'Not found')[:50]}...")
            output_lines.append(f"  Title Length: {seo.get('title_length', 0)} characters")
            output_lines.append(f"  Meta Description Length: {seo.get('meta_description_length', 0)} characters")
            output_lines.append(f"  Title SEO Score: {seo.get('title_seo_score', 0):.1f}/10")
            output_lines.append("")
        
        # Performance
        if 'performance' in analysis:
            perf = analysis['performance']
            output_lines.append("Performance Analysis:")
            output_lines.append(f"  Response Time: {perf.get('response_time_seconds', 0):.2f} seconds")
            output_lines.append(f"  Status Code: {perf.get('status_code', 'Unknown')}")
            output_lines.append(f"  Content Size: {perf.get('content_size_bytes', 0):,} bytes")
            output_lines.append(f"  Performance Score: {perf.get('performance_score', 0):.1f}/10")
            output_lines.append("")
        
        # Content Audit
        if 'content_audit' in analysis:
            content = analysis['content_audit']
            output_lines.append("Content Audit:")
            output_lines.append(f"  Content Length: {content.get('content_length', 0):,} characters")
            output_lines.append(f"  Headings Found: {content.get('heading_count', 0)}")
            output_lines.append(f"  Has Meta Description: {content.get('has_meta_description', False)}")
            output_lines.append(f"  Has Structured Data: {content.get('has_structured_data', False)}")
            output_lines.append("")
        
        # Authority Metrics (for prospects)
        if 'authority_metrics' in analysis:
            authority = analysis['authority_metrics']
            output_lines.append("Authority Metrics:")
            output_lines.append(f"  Domain: {authority.get('domain', 'Unknown')}")
            output_lines.append(f"  Estimated Domain Authority: {authority.get('estimated_domain_authority', 0)}")
            output_lines.append(f"  Estimated Backlinks: {authority.get('backlink_estimate', 0):,}")
            output_lines.append("")
    
    # Recommendations
    if 'recommendations' in results:
        output_lines.append("RECOMMENDATIONS:")
        output_lines.append("-" * 40)
        for i, rec in enumerate(results['recommendations'], 1):
            output_lines.append(f"{i}. {rec}")
        output_lines.append("")
    
    output_lines.append("=" * 60)
    
    return "\n".join(output_lines)


async def main() -> None:
    """Main CLI function."""
    args = parse_arguments()
    setup_logging(args.log_level)
    
    logger = logging.getLogger(__name__)
    logger.info(f"Starting {args.mode} analysis for {args.target_url}")
    
    try:
        # Initialize config and analyzer
        config = OrionConfig()
        analyzer = SiteAnalyzer(config)
        
        # Run analysis
        results = await analyzer.analyze(args.mode, args.target_url)
        
        # Format output
        if args.format == "json":
            output = json.dumps(results, indent=2)
        else:
            output = format_pretty_output(results)
        
        # Save or print results
        if args.output:
            with open(args.output, 'w') as f:
                if args.format == "json":
                    json.dump(results, f, indent=2)
                else:
                    f.write(output)
            logger.info(f"Results saved to {args.output}")
        else:
            print(output)
        
        logger.info("Analysis completed successfully")
        
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
