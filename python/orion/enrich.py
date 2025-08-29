

"""
Phase 7: Multi-Stage Content Enrichment Pipeline

This module provides a 3-stage content generation pipeline:
1. generate_outline - Strategic outline creation
2. write_sections - Section-by-section content writing
3. enrich_for_eeat - E-E-A-T enrichment and final polish
"""

import logging
import json
import time
from typing import Dict, Any, List, Optional
import random

logger = logging.getLogger(__name__)


class GenerationMetrics:
    """Track metrics for each generation stage."""
    
    def __init__(self):
        self.model = None
        self.tokens = 0
        self.latency_ms = 0
        self.cost_usd = 0.0
        self.stage = None
        
    def log_metrics(self):
        """Log the generation metrics."""
        logger.info(f"Stage: {self.stage} | Model: {self.model} | "
                   f"Tokens: {self.tokens} | Latency: {self.latency_ms}ms | "
                   f"Cost: ${self.cost_usd:.4f}")


def generate_outline(topic: Dict[str, Any], strategy: Dict[str, Any], 
                    rulebook: Dict[str, Any], override_rulebook: bool = False) -> Dict[str, Any]:
    """
    Stage 1: Generate detailed content outline.
    
    Args:
        topic: Topic dictionary with title, angle, etc.
        strategy: SiteStrategy configuration
        rulebook: GlobalRulebook rules
        override_rulebook: Skip rulebook enforcement if True
        
    Returns:
        Dictionary with outline structure and metadata
    """
    metrics = GenerationMetrics()
    metrics.stage = "outline"
    metrics.model = "gpt-4o-mini"
    start_time = time.time()
    
    title = topic.get('title', 'Untitled Topic')
    angle = topic.get('angle', '')
    
    # Check for override flag
    if topic.get('flags', {}).get('ignore_rulebook') or override_rulebook:
        logger.info(f"Skipping rulebook enforcement for topic: {title}")
        rulebook_rules = {}
    else:
        rulebook_rules = rulebook.get('aio', {}).get('content_layout', [])
    
    logger.info(f"Generating outline for: {title}")
    
    # Simulate SERP analysis and strategic planning
    outline_structure = []
    
    # Use rulebook layout if available, otherwise default structure
    if rulebook_rules:
        for section in rulebook_rules:
            outline_structure.append({
                "section": section,
                "heading": f"H2: {section.replace('_', ' ').title()}",
                "key_points": [f"Key point about {section}", f"Detail about {section}"],
                "seo_target": title.lower(),
                "internal_links": [],
                "citations_needed": True if rulebook.get('eeat', {}).get('require_citations') else False
            })
    else:
        # Default structure
        default_sections = ["Introduction", "Key Points", "How To", "FAQs", "Summary"]
        for section in default_sections:
            outline_structure.append({
                "section": section.lower().replace(' ', '_'),
                "heading": f"H2: {section}",
                "key_points": [f"Key point about {section.lower()}", f"Detail about {section.lower()}"],
                "seo_target": title.lower(),
                "internal_links": [],
                "citations_needed": True
            })
    
    # Apply site persona if available
    if strategy.get('site_persona'):
        for section in outline_structure:
            section['persona_notes'] = f"Write in tone: {strategy['site_persona']}"
    
    # Apply target audience
    if strategy.get('target_audience'):
        for section in outline_structure:
            section['audience_notes'] = f"Target: {strategy['target_audience']}"
    
    # Simulate metrics
    metrics.tokens = len(json.dumps(outline_structure)) * 2  # Rough estimate
    metrics.latency_ms = int((time.time() - start_time) * 1000)
    metrics.cost_usd = metrics.tokens * 0.000005  # Rough GPT-4o-mini pricing
    metrics.log_metrics()
    
    return {
        "outline": outline_structure,
        "primary_keyword": title.lower(),
        "seo_targets": [title.lower()],
        "citations_required": rulebook.get('eeat', {}).get('require_citations', True),
        "tone_guidelines": strategy.get('eeat_guidelines', {}).get('tone_of_voice', []),
        "metadata": {
            "generation_stage": "outline",
            "metrics": {
                "model": metrics.model,
                "tokens": metrics.tokens,
                "latency_ms": metrics.latency_ms,
                "cost_usd": metrics.cost_usd
            }
        }
    }


def write_sections(outline: Dict[str, Any], strategy: Dict[str, Any], 
                  rulebook: Dict[str, Any]) -> Dict[str, Any]:
    """
    Stage 2: Write content for each section based on outline.
    
    Args:
        outline: Output from generate_outline
        strategy: SiteStrategy configuration
        rulebook: GlobalRulebook rules
        
    Returns:
        Dictionary with complete draft content
    """
    metrics = GenerationMetrics()
    metrics.stage = "sections"
    metrics.model = "gpt-4o-mini"
    start_time = time.time()
    
    logger.info("Writing sections based on outline")
    
    sections_content = []
    images_needed = []
    internal_links = []
    outbound_links = []
    
    for section_outline in outline.get('outline', []):
        # Generate section content
        section_name = section_outline['section']
        heading = section_outline['heading']
        key_points = section_outline.get('key_points', [])
        
        # Create content for this section
        content_paragraphs = []
        for point in key_points:
            # Simulate content generation with persona/audience awareness
            paragraph = f"<p>This section covers {point}. "
            
            if section_outline.get('persona_notes'):
                paragraph += f"[Written with persona: {section_outline['persona_notes']}] "
            
            if section_outline.get('audience_notes'):
                paragraph += f"[Targeted to: {section_outline['audience_notes']}] "
            
            paragraph += f"Here we explain the important aspects and provide actionable insights.</p>"
            content_paragraphs.append(paragraph)
        
        section_content = {
            "heading": heading,
            "content": "\n".join(content_paragraphs),
            "section_id": section_name,
            "citations_needed": section_outline.get('citations_needed', False),
            "seo_optimized": True
        }
        
        sections_content.append(section_content)
        
        # Track images needed (following rulebook requirements)
        if rulebook.get('seo', {}).get('image_alt_required'):
            images_needed.append({
                "section": section_name,
                "alt_text": f"Illustration for {section_name}",
                "suggested_caption": f"Visual guide for {section_name}"
            })
        
        # Track internal links needed
        min_internal = rulebook.get('seo', {}).get('internal_links_min', 0)
        if min_internal > 0:
            internal_links.extend([f"internal-link-{i}" for i in range(min_internal)])
        
        # Track outbound links needed
        min_outbound = rulebook.get('seo', {}).get('outbound_links_min', 0)
        if min_outbound > 0:
            outbound_links.extend([f"outbound-link-{i}" for i in range(min_outbound)])
    
    # Simulate metrics
    total_content = json.dumps(sections_content)
    metrics.tokens = len(total_content) * 3  # Rough estimate for generation
    metrics.latency_ms = int((time.time() - start_time) * 1000)
    metrics.cost_usd = metrics.tokens * 0.000005
    metrics.log_metrics()
    
    return {
        "sections": sections_content,
        "images_needed": images_needed,
        "internal_links_needed": internal_links,
        "outbound_links_needed": outbound_links,
        "primary_keyword": outline.get('primary_keyword'),
        "metadata": {
            "generation_stage": "sections",
            "metrics": {
                "model": metrics.model,
                "tokens": metrics.tokens,
                "latency_ms": metrics.latency_ms,
                "cost_usd": metrics.cost_usd
            },
            "sections_count": len(sections_content)
        }
    }


def enrich_for_eeat(draft: Dict[str, Any], strategy: Dict[str, Any], 
                   rulebook: Dict[str, Any]) -> Dict[str, Any]:
    """
    Stage 3: E-E-A-T enrichment and final content polish.
    
    Args:
        draft: Output from write_sections
        strategy: SiteStrategy configuration
        rulebook: GlobalRulebook rules
        
    Returns:
        Dictionary with final enriched content and metadata
    """
    metrics = GenerationMetrics()
    metrics.stage = "eeat"
    metrics.model = "gpt-4o"
    start_time = time.time()
    
    logger.info("Applying E-E-A-T enrichment")
    
    # Apply author bio if required
    author_bio = ""
    if rulebook.get('eeat', {}).get('require_author_bio'):
        bio_template = strategy.get('eeat_guidelines', {}).get('author_bio_template')
        if bio_template:
            author_bio = bio_template
        else:
            author_bio = "Article by expert content team with years of experience in this field."
    
    # Ensure citations are in correct style
    citation_style = rulebook.get('eeat', {}).get('citation_style', 'harvard')
    
    # Apply preferred sources where relevant
    preferred_sources = strategy.get('eeat_guidelines', {}).get('preferred_sources', [])
    
    # Build final content
    final_content = ""
    
    # Add sections with E-E-A-T enhancements
    for section in draft.get('sections', []):
        final_content += f"\n{section['heading']}\n"
        final_content += section['content']
        
        # Add citations if needed
        if section.get('citations_needed') and preferred_sources:
            citation = f"\n<p><em>Source: {random.choice(preferred_sources)}</em></p>"
            final_content += citation
    
    # Add author bio at the end
    if author_bio:
        final_content += f"\n\n<div class='author-bio'>{author_bio}</div>"
    
    # Create structured data (JSON-LD)
    structured_data = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": draft.get('primary_keyword', '').title(),
        "author": {
            "@type": "Person",
            "name": "Expert Team"
        },
        "datePublished": time.strftime("%Y-%m-%d"),
        "description": "Expert content with reliable sources"
    }
    
    # SEO metadata
    seo_title = draft.get('primary_keyword', '').title()
    title_rules = rulebook.get('seo', {}).get('title_length', {})
    if len(seo_title) < title_rules.get('min', 0):
        seo_title += " - Complete Guide"
    elif len(seo_title) > title_rules.get('max', 100):
        seo_title = seo_title[:title_rules.get('max', 100)] + "..."
    
    meta_desc_rules = rulebook.get('seo', {}).get('meta_description', {})
    meta_description = f"Learn about {draft.get('primary_keyword', 'this topic')} with expert insights."
    if len(meta_description) < meta_desc_rules.get('min', 0):
        meta_description += " Complete guide with actionable tips and reliable sources."
    
    # Simulate metrics
    metrics.tokens = len(final_content) * 2  # Rough estimate
    metrics.latency_ms = int((time.time() - start_time) * 1000)
    metrics.cost_usd = metrics.tokens * 0.00001  # GPT-4o pricing
    metrics.log_metrics()
    
    return {
        "title": seo_title,
        "content": final_content,
        "meta_description": meta_description,
        "structured_data": structured_data,
        "author_bio": author_bio,
        "citations_used": preferred_sources,
        "images": draft.get('images_needed', []),
        "internal_links": draft.get('internal_links_needed', []),
        "outbound_links": draft.get('outbound_links_needed', []),
        "status": "draft",
        "metadata": {
            "generation_stage": "eeat",
            "metrics": {
                "model": metrics.model,
                "tokens": metrics.tokens,
                "latency_ms": metrics.latency_ms,
                "cost_usd": metrics.cost_usd
            },
            "total_pipeline_cost": sum([
                draft.get('metadata', {}).get('metrics', {}).get('cost_usd', 0),
                metrics.cost_usd
            ]),
            "citation_style": citation_style,
            "eeat_enhanced": True
        }
    }


def generate_post(topic: Dict[str, Any], strategy: Dict[str, Any] = None, 
                 rulebook: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Legacy function for backward compatibility.
    Runs the full 3-stage pipeline.
    
    Args:
        topic: Topic dictionary with title, angle, etc.
        strategy: SiteStrategy configuration (optional)
        rulebook: GlobalRulebook rules (optional)
        
    Returns:
        Dictionary with WordPress post data
    """
    
    # Use defaults if not provided
    if strategy is None:
        strategy = {}
    
    if rulebook is None:
        rulebook = {
            "eeat": {"require_citations": True, "require_author_bio": True},
            "seo": {"internal_links_min": 2, "outbound_links_min": 1}
        }
    
    logger.info(f"Running full 3-stage pipeline for: {topic.get('title', 'Untitled')}")
    
    # Stage 1: Generate outline
    outline_result = generate_outline(topic, strategy, rulebook)
    
    # Stage 2: Write sections
    draft_result = write_sections(outline_result, strategy, rulebook)
    
    # Stage 3: E-E-A-T enrichment
    final_result = enrich_for_eeat(draft_result, strategy, rulebook)
    
    # Return in WordPress-compatible format
    return {
        "title": final_result["title"],
        "content": final_result["content"],
        "status": "draft",
        "meta_description": final_result["meta_description"],
        "categories": [],
        "metadata": {
            "structured_data": final_result["structured_data"],
            "images_needed": final_result["images"],
            "pipeline_metrics": {
                "stages_completed": 3,
                "total_cost_usd": final_result["metadata"]["total_pipeline_cost"]
            }
        }
    }
