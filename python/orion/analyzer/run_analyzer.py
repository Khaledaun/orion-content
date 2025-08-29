#!/usr/bin/env python3
"""
Strategic Site Analyzer CLI
Command-line interface for running site analysis.
"""

import sys
import os

def main():
    """Main entry point with proper import isolation."""
    # Import inside main to avoid side effects
    import argparse
    import asyncio
    import json
    import logging
    import time
    from pathlib import Path
    from typing import Dict, Any
    from urllib.parse import urlparse

    from ..config import Config as OrionConfig
    from .analyzer import SiteAnalyzer

    def setup_logging(level: str = "INFO") -> None:
        """Setup logging configuration."""
        logging.basicConfig(
            level=getattr(logging, level.upper()),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )

    def validate_url(url: str) -> bool:
        """Validate URL format."""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False

    def get_domain_from_url(url: str) -> str:
        """Extract domain from URL for filename generation."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain.replace('.', '-')
        except Exception:
            return 'unknown-domain'

    def parse_arguments() -> argparse.Namespace:
        """Parse command line arguments."""
        parser = argparse.ArgumentParser(
            description="Orion Strategic Site Analyzer",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  python -m orion.analyzer.run_analyzer my-site https://example.com
  python -m orion.analyzer.run_analyzer competitor https://competitor.com --max-pages 10
  python -m orion.analyzer.run_analyzer prospect https://prospect.com --use-llm --verbose
            """
        )
        
        parser.add_argument("mode", choices=["my-site", "competitor", "prospect"], help="Analysis mode")
        parser.add_argument("target_url", help="URL to analyze (must include http:// or https://)")
        parser.add_argument("--output", "-o", help="Output file path or directory")
        parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
        parser.add_argument("--format", default="json", choices=["pretty", "json"])
        parser.add_argument("--max-pages", type=int, default=5, help="Maximum pages to crawl (default: 5)")
        parser.add_argument("--use-llm", action="store_true", help="Enable LLM-enhanced analysis")
        parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
        
        args = parser.parse_args()
        
        if args.verbose:
            args.log_level = "DEBUG"
        
        if not validate_url(args.target_url):
            parser.error(f"Invalid URL format: {args.target_url}. URL must include http:// or https://")
        
        if args.max_pages < 1:
            parser.error("--max-pages must be at least 1")
        
        return args

    def determine_output_path(args: argparse.Namespace) -> str:
        """Determine output file path."""
        if args.output is None:
            output_dir = Path("./analysis-reports")
            output_dir.mkdir(exist_ok=True)
            domain = get_domain_from_url(args.target_url)
            filename = f"analysis-report-{args.mode}-{domain}.json"
            return str(output_dir / filename)
        
        output_path = Path(args.output)
        if output_path.is_dir() or args.output.endswith('/'):
            output_path.mkdir(exist_ok=True)
            domain = get_domain_from_url(args.target_url)
            filename = f"analysis-report-{args.mode}-{domain}.json"
            return str(output_path / filename)
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        return str(output_path)

    async def run_analysis() -> None:
        """Execute the analysis."""
        args = parse_arguments()
        setup_logging(args.log_level)
        
        logger = logging.getLogger(__name__)
        logger.info(f"Starting {args.mode} analysis for {args.target_url}")
        
        start_time = time.time()
        
        try:
            config = OrionConfig()
            analyzer = SiteAnalyzer(config)
            
            results = await analyzer.analyze(
                mode=args.mode, 
                target_url=args.target_url,
                max_pages=args.max_pages,
                use_llm=args.use_llm
            )
            
            end_time = time.time()
            execution_time_ms = int((end_time - start_time) * 1000)
            
            if 'metadata' not in results:
                results['metadata'] = {}
            
            results['metadata'].update({
                'execution_time_ms': execution_time_ms,
                'cli_version': '1.0.0',
                'max_pages_requested': args.max_pages,
                'llm_enhanced': args.use_llm
            })
            
            output_path = determine_output_path(args)
            
            with open(output_path, 'w') as f:
                json.dump(results, f, indent=2)
            
            logger.info(f"Results saved to {output_path}")
            
            print(f"✅ Analysis completed successfully in {execution_time_ms}ms")
            print(f"📄 Results saved to: {output_path}")
            print(f"🎯 Mode: {args.mode}")
            print(f"🌐 URL: {args.target_url}")
            if args.use_llm:
                print("🤖 LLM enhancement: Enabled")
            print(f"📊 Pages analyzed: up to {args.max_pages}")
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            print(f"❌ Analysis failed: {e}")
            sys.exit(1)

    # Run the async analysis
    try:
        asyncio.run(run_analysis())
    except KeyboardInterrupt:
        print("\n⚠️  Analysis interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
