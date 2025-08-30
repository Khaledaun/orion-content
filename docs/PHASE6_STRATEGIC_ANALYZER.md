
# Phase 6: Strategic Site Analyzer

## Overview
The Strategic Site Analyzer is a comprehensive analysis tool that provides competitive intelligence and strategic insights for content optimization. It supports three distinct analysis modes for different use cases.

## Features

### Analysis Modes

1. **My-Site Analysis (`my-site`)**
   - Content structure audit
   - SEO analysis and optimization recommendations
   - Performance metrics and improvements
   - Content gap identification
   - Actionable optimization recommendations

2. **Competitor Analysis (`competitor`)**
   - Content strategy analysis
   - Keyword opportunity identification
   - Link building opportunities
   - Content format and frequency insights
   - Competitive positioning recommendations

3. **Prospect Analysis (`prospect`)**
   - Site authority and credibility assessment
   - Content alignment scoring
   - Contact and outreach opportunity identification
   - Partnership potential evaluation
   - Personalized outreach recommendations

## Installation

The analyzer is included in the main Orion package. Install dependencies:

```bash
cd python
pip install -r requirements.txt
```

## Usage

### Command Line Interface

```bash
# Analyze your own site
python -m orion.analyzer.run_analyzer my-site https://yoursite.com

# Competitor analysis
python -m orion.analyzer.run_analyzer competitor https://competitor.com

# Prospect analysis for outreach
python -m orion.analyzer.run_analyzer prospect https://prospect.com

# Save results to file
python -m orion.analyzer.run_analyzer my-site https://yoursite.com --output results.json

# JSON output format
python -m orion.analyzer.run_analyzer competitor https://competitor.com --format json

# Verbose logging
python -m orion.analyzer.run_analyzer prospect https://prospect.com --log-level DEBUG
```

### Python API

```python
import asyncio
from orion.config import OrionConfig
from orion.analyzer import SiteAnalyzer

async def analyze_site():
    config = OrionConfig()
    analyzer = SiteAnalyzer(config)
    
    # Run analysis
    results = await analyzer.analyze('my-site', 'https://yoursite.com')
    print(results)

# Run the analysis
asyncio.run(analyze_site())
```

## Output Format

### My-Site Analysis Output
```json
{
  "mode": "my-site",
  "target_url": "https://yoursite.com",
  "timestamp": "2024-01-01T00:00:00",
  "analysis": {
    "content_audit": {
      "headings_structure": [...],
      "content_length": 2500,
      "has_meta_description": true,
      "has_structured_data": false,
      "heading_count": 8
    },
    "seo_analysis": {
      "title": "Your Page Title",
      "title_length": 45,
      "meta_description": "Your meta description...",
      "meta_description_length": 140,
      "title_seo_score": 8.5,
      "meta_seo_score": 9.0
    },
    "performance": {
      "response_time_seconds": 1.2,
      "status_code": 200,
      "content_size_bytes": 15000,
      "performance_score": 9.0
    },
    "content_gaps": {
      "missing_topics": ["AI trends", "Industry insights"],
      "content_frequency": "weekly",
      "recommended_content_types": ["how-to guides", "case studies"]
    }
  },
  "recommendations": [
    "Consider expanding content length for better SEO value",
    "Add structured data markup for better search visibility"
  ]
}
```

## Testing

Run the test suite:

```bash
cd python
python -m pytest tests/analyzer/ -v
```

## Integration with Existing Pipeline

The analyzer can be integrated with existing Orion workflows:

1. **Pre-content Planning**: Use competitor analysis to inform content strategy
2. **Post-publishing Optimization**: Use my-site analysis to optimize published content
3. **Outreach Campaigns**: Use prospect analysis for targeted outreach and partnerships

## Configuration

The analyzer uses the existing Orion configuration system. Ensure these environment variables are set:

- `ORION_API_URL`: Orion server API URL
- `ORION_API_KEY`: API authentication key

## Extensibility

The analyzer is designed for extensibility:

- Add new analysis modes by implementing new `_analyze_*` methods
- Extend analysis metrics by adding new audit functions
- Integrate with external SEO and analytics APIs
- Add custom scoring algorithms for specific industries
