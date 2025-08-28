
"""
Content enrichment for Orion topics.

This module provides post generation functionality that can be expanded
from simple templates to full LLM-powered content generation.
"""

import logging
import os
import random
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)


def get_prompts_directory() -> Path:
    """Get the path to the prompts directory."""
    current_dir = Path(__file__).parent
    return current_dir / "prompts"


def get_available_prompts() -> List[str]:
    """Get list of available prompt files."""
    prompts_dir = get_prompts_directory()
    if not prompts_dir.exists():
        logger.warning(f"Prompts directory not found: {prompts_dir}")
        return []
    
    prompt_files = [f.name for f in prompts_dir.glob("*.txt") if f.is_file()]
    logger.debug(f"Found {len(prompt_files)} prompt files: {prompt_files}")
    return prompt_files


def load_prompt_template(strategy: str) -> Tuple[str, str]:
    """
    Load prompt template based on strategy.
    
    Args:
        strategy: 'default', 'random', or specific filename
        
    Returns:
        Tuple of (prompt_content, prompt_name_used)
    """
    prompts_dir = get_prompts_directory()
    
    if strategy == 'default':
        return "", "template-based"
    
    available_prompts = get_available_prompts()
    if not available_prompts:
        logger.warning("No prompt files found, falling back to template-based generation")
        return "", "template-based"
    
    if strategy == 'random':
        # Pick random prompt
        selected_prompt = random.choice(available_prompts)
    elif strategy in available_prompts:
        # Use specific prompt file
        selected_prompt = strategy
    elif f"{strategy}.txt" in available_prompts:
        # Allow strategy without .txt extension
        selected_prompt = f"{strategy}.txt"
    else:
        logger.warning(f"Prompt strategy '{strategy}' not found, using random prompt")
        selected_prompt = random.choice(available_prompts)
    
    # Load the prompt content
    prompt_file = prompts_dir / selected_prompt
    try:
        with open(prompt_file, 'r', encoding='utf-8') as f:
            prompt_content = f.read()
        logger.debug(f"Loaded prompt template: {selected_prompt}")
        return prompt_content, selected_prompt
    except Exception as e:
        logger.error(f"Error loading prompt file {selected_prompt}: {e}")
        return "", "template-based"


def generate_post(topic: Dict[str, Any], prompt_strategy: str = 'default') -> Dict[str, Any]:
    """
    Generate WordPress post content from an Orion topic.
    
    This implementation supports multiple prompt strategies for content variety.
    Future LLM integration can enhance this without changing the interface.
    
    Args:
        topic: Topic dictionary with title, angle, etc.
        prompt_strategy: Strategy for content generation ('default', 'random', or filename)
        
    Returns:
        Dictionary with post data and metadata:
        {
            "post_data": {
                "title": str,
                "content": str,
                "status": str,
                "categories": List[str]
            },
            "metadata": {
                "prompt_used": str,
                "llm_model": str,
                "input_tokens": int,
                "output_tokens": int,
                "estimated_cost": float
            }
        }
    """
    
    title = topic.get('title', 'Untitled Topic')
    angle = topic.get('angle', '')
    score = topic.get('score', 0.5)
    
    logger.debug(f"Generating post content for topic: {title[:50]} using strategy: {prompt_strategy}")
    
    # Load prompt template based on strategy
    prompt_template, prompt_used = load_prompt_template(prompt_strategy)
    
    # Generate content based on prompt strategy
    if prompt_template and prompt_used != "template-based":
        # Use prompt-based generation (future LLM integration point)
        full_content = generate_prompt_based_content(title, angle, score, prompt_template)
        model_used = f"template-prompt-{prompt_used}"
    else:
        # Use existing template-based generation
        full_content = generate_template_content(title, angle, score)
        model_used = "template-based"
    
    # Determine categories based on title content
    categories = extract_categories(title)
    
    # Create post data
    post_data = {
        "title": title,
        "content": full_content,
        "status": "draft",  # Always create as draft
        "categories": categories
    }
    
    # Create metadata for cost and quality tracking
    metadata = {
        "prompt_used": prompt_used,
        "llm_model": model_used,
        "input_tokens": 0,  # Template-based doesn't use tokens
        "output_tokens": 0,
        "estimated_cost": 0.0
    }
    
    logger.debug(f"Generated {len(full_content)} character post with {len(categories)} categories using {prompt_used}")
    
    return {
        "post_data": post_data,
        "metadata": metadata
    }


def generate_prompt_based_content(title: str, angle: str, score: float, prompt_template: str) -> str:
    """
    Generate content using a prompt template.
    
    This is where future LLM integration will happen. For now, it uses template
    substitution with the prompt structure as guidance.
    """
    topic = extract_main_topic(title)
    
    # For now, create structured content based on the prompt template style
    # Future LLM integration would use the prompt_template directly
    
    content_sections = []
    
    # Analyze prompt template to determine content style
    if "listicle" in prompt_template.lower() or "numbered" in prompt_template.lower():
        content_sections = generate_listicle_content(title, angle, score, topic)
    elif "how-to" in prompt_template.lower() or "step" in prompt_template.lower():
        content_sections = generate_howto_content(title, angle, score, topic)
    elif "analysis" in prompt_template.lower() or "executive summary" in prompt_template.lower():
        content_sections = generate_analysis_content(title, angle, score, topic)
    elif "interview" in prompt_template.lower() or "q&a" in prompt_template.lower():
        content_sections = generate_interview_content(title, angle, score, topic)
    elif "case study" in prompt_template.lower():
        content_sections = generate_case_study_content(title, angle, score, topic)
    else:
        # Fallback to template content
        return generate_template_content(title, angle, score)
    
    return "\n\n".join(content_sections)


def generate_template_content(title: str, angle: str, score: float) -> str:
    """Generate content using the original template approach."""
    content_sections = []
    
    # Introduction
    intro = generate_intro(title, angle)
    content_sections.append(f"<h2>Introduction</h2>\n<p>{intro}</p>")
    
    # Key Points
    key_points = generate_key_points(title, angle)
    points_html = "\n".join(f"<li>{point}</li>" for point in key_points)
    content_sections.append(f"<h2>Key Insights</h2>\n<ul>\n{points_html}\n</ul>")
    
    # Analysis/Discussion
    analysis = generate_analysis(title, angle, score)
    content_sections.append(f"<h2>Analysis</h2>\n<p>{analysis}</p>")
    
    # Conclusion
    conclusion = generate_conclusion(title)
    content_sections.append(f"<h2>Conclusion</h2>\n<p>{conclusion}</p>")
    
    return "\n\n".join(content_sections)


def generate_listicle_content(title: str, angle: str, score: float, topic: str) -> List[str]:
    """Generate listicle-style content sections."""
    sections = []
    
    # Engaging introduction
    intro = f"In today's fast-paced world, understanding {topic} is more important than ever. {angle} Here are the key insights that industry professionals need to know."
    sections.append(f"<h2>Why {topic} Matters Now</h2>\n<p>{intro}</p>")
    
    # Numbered list of key points
    points = [
        f"Strategic implementation of {topic} drives competitive advantage",
        f"Organizations are seeing measurable ROI from {topic} investments",
        f"Future-proofing requires understanding {topic} fundamentals",
        f"Cross-functional collaboration enhances {topic} effectiveness",
        f"Data-driven approaches to {topic} yield better outcomes"
    ]
    
    list_html = ""
    for i, point in enumerate(points, 1):
        list_html += f"<h3>{i}. {point}</h3>\n<p>This insight demonstrates how {topic} continues to evolve and impact business operations across industries.</p>\n\n"
    
    sections.append(f"<h2>Top 5 Insights About {topic}</h2>\n{list_html}")
    
    # Action items
    sections.append(f"<h2>Next Steps</h2>\n<p>Ready to leverage {topic} in your organization? Start by assessing your current capabilities and identifying key areas for improvement.</p>")
    
    return sections


def generate_howto_content(title: str, angle: str, score: float, topic: str) -> List[str]:
    """Generate how-to guide style content."""
    sections = []
    
    # Problem definition
    sections.append(f"<h2>The Challenge</h2>\n<p>Many organizations struggle with implementing {topic} effectively. {angle} This guide provides a systematic approach to success.</p>")
    
    # Prerequisites
    sections.append(f"<h2>Before You Begin</h2>\n<ul><li>Basic understanding of {topic} concepts</li><li>Access to relevant tools and resources</li><li>Stakeholder buy-in and support</li></ul>")
    
    # Step-by-step process
    steps = [
        ("Assessment and Planning", f"Begin by evaluating your current {topic} maturity and identifying specific goals."),
        ("Implementation Strategy", f"Develop a phased approach to {topic} deployment that minimizes risk."),
        ("Execution and Monitoring", f"Launch your {topic} initiative with proper tracking and measurement systems."),
        ("Optimization and Scaling", f"Refine your approach based on results and expand {topic} across your organization.")
    ]
    
    steps_html = ""
    for i, (step_title, step_desc) in enumerate(steps, 1):
        steps_html += f"<h3>Step {i}: {step_title}</h3>\n<p>{step_desc}</p>\n\n"
    
    sections.append(f"<h2>Implementation Roadmap</h2>\n{steps_html}")
    
    # Success metrics
    sections.append(f"<h2>Measuring Success</h2>\n<p>Track these key indicators to ensure your {topic} implementation is delivering value and meeting objectives.</p>")
    
    return sections


def generate_analysis_content(title: str, angle: str, score: float, topic: str) -> List[str]:
    """Generate analytical content sections."""
    sections = []
    
    # Executive summary
    confidence = "strong momentum" if score > 0.7 else "emerging trends" if score > 0.4 else "early indicators"
    sections.append(f"<h2>Executive Summary</h2>\n<p>Current market analysis reveals {confidence} in {topic} adoption. {angle} Key stakeholders should monitor these developments closely.</p>")
    
    # Market dynamics
    sections.append(f"<h2>Market Analysis</h2>\n<p>The {topic} landscape is characterized by rapid innovation and increasing investment. Organizations are recognizing the strategic value of {topic} initiatives.</p>")
    
    # Critical factors
    sections.append(f"<h2>Key Success Factors</h2>\n<ul><li>Leadership commitment to {topic} transformation</li><li>Investment in proper tools and training</li><li>Clear measurement and accountability systems</li></ul>")
    
    # Future outlook
    sections.append(f"<h2>Looking Ahead</h2>\n<p>The future of {topic} will likely be shaped by continued technological advancement and evolving business needs. Organizations that prepare now will be better positioned for success.</p>")
    
    return sections


def generate_interview_content(title: str, angle: str, score: float, topic: str) -> List[str]:
    """Generate interview-style Q&A content."""
    sections = []
    
    # Introduction
    sections.append(f"<h2>Expert Insights on {topic}</h2>\n<p>We sat down with industry experts to discuss the current state and future of {topic}. {angle}</p>")
    
    # Q&A format
    qa_pairs = [
        ("What makes {topic} such a critical focus area right now?", "The convergence of market forces and technological capabilities has created unprecedented opportunities in {topic}."),
        ("What are the biggest challenges organizations face with {topic}?", "Most organizations struggle with change management and ensuring proper integration across existing systems."),
        ("What advice would you give to leaders considering {topic} investments?", "Start with a clear strategy, secure leadership commitment, and focus on building internal capabilities alongside technology deployment."),
        ("Where do you see {topic} heading in the next few years?", "We expect continued evolution toward more integrated, intelligent, and user-friendly {topic} solutions.")
    ]
    
    qa_html = ""
    for question, answer in qa_pairs:
        formatted_question = question.format(topic=topic)
        formatted_answer = answer.format(topic=topic)
        qa_html += f"<h3>Q: {formatted_question}</h3>\n<p><strong>A:</strong> {formatted_answer}</p>\n\n"
    
    sections.append(qa_html)
    
    # Wrap up
    sections.append(f"<h2>Key Takeaways</h2>\n<p>Success with {topic} requires strategic thinking, proper planning, and commitment to continuous improvement.</p>")
    
    return sections


def generate_case_study_content(title: str, angle: str, score: float, topic: str) -> List[str]:
    """Generate case study narrative content."""
    sections = []
    
    # Challenge setup
    sections.append(f"<h2>The Challenge</h2>\n<p>A mid-size organization faced significant challenges in their {topic} implementation. {angle} Traditional approaches were not delivering the expected results.</p>")
    
    # Solution approach
    sections.append(f"<h2>The Approach</h2>\n<p>The organization developed a comprehensive strategy focusing on people, process, and technology aspects of {topic}. This multi-faceted approach addressed root causes rather than just symptoms.</p>")
    
    # Implementation
    sections.append(f"<h2>Implementation</h2>\n<p>Over a six-month period, the team executed their {topic} transformation plan with careful attention to change management and stakeholder engagement.</p>")
    
    # Results
    impact_level = "significant" if score > 0.7 else "measurable" if score > 0.4 else "initial"
    sections.append(f"<h2>Results</h2>\n<p>The initiative delivered {impact_level} improvements across key performance indicators, demonstrating the value of a strategic approach to {topic}.</p>")
    
    # Lessons learned
    sections.append(f"<h2>Lessons Learned</h2>\n<p>Key success factors included executive sponsorship, cross-functional collaboration, and a commitment to iterative improvement in {topic} capabilities.</p>")
    
    return sections


def generate_intro(title: str, angle: str) -> str:
    """Generate introduction paragraph."""
    
    intro_templates = [
        "In today's rapidly evolving landscape, understanding {topic} has become crucial for professionals and organizations alike.",
        "The field of {topic} continues to shape how we approach modern challenges and opportunities.",
        "{topic} represents a significant development that deserves careful analysis and consideration.",
        "As we navigate the complexities of {topic}, it's important to examine the key factors and implications.",
        "Recent developments in {topic} have sparked considerable interest and debate among industry experts."
    ]
    
    # Extract topic from title (simple heuristic)
    topic = extract_main_topic(title)
    
    intro = random.choice(intro_templates).format(topic=topic)
    
    if angle:
        intro += f" {angle} This perspective offers valuable insights into the broader implications and potential outcomes."
    
    return intro


def generate_key_points(title: str, angle: str) -> List[str]:
    """Generate key discussion points."""
    
    topic = extract_main_topic(title)
    
    point_templates = [
        f"Current trends in {topic} suggest significant changes ahead",
        f"Industry leaders are adopting new approaches to {topic}",
        f"The impact of {topic} extends beyond immediate applications",
        f"Key stakeholders must consider multiple factors when evaluating {topic}",
        f"Best practices for {topic} continue to evolve",
        f"Challenges and opportunities in {topic} require strategic thinking"
    ]
    
    # Select 3-4 random points
    selected_points = random.sample(point_templates, k=min(4, len(point_templates)))
    
    return selected_points


def generate_analysis(title: str, angle: str, score: float) -> str:
    """Generate analysis section."""
    
    topic = extract_main_topic(title)
    
    # Use score to determine tone/confidence
    if score > 0.7:
        confidence = "strong evidence suggests"
        tone = "significant potential"
    elif score > 0.4:
        confidence = "emerging patterns indicate"
        tone = "notable opportunities"
    else:
        confidence = "initial observations suggest"
        tone = "areas for further investigation"
    
    analysis_templates = [
        f"Looking at the broader context, {confidence} that {topic} will play an increasingly important role. This {tone} makes it essential for stakeholders to stay informed and prepared.",
        f"The data surrounding {topic} reveals interesting patterns. {confidence} that organizations focusing on this area will benefit from {tone} in the coming months.",
        f"From a strategic perspective, {topic} presents both challenges and opportunities. {confidence} that careful planning and implementation will unlock {tone}."
    ]
    
    return random.choice(analysis_templates)


def generate_conclusion(title: str) -> str:
    """Generate conclusion paragraph."""
    
    topic = extract_main_topic(title)
    
    conclusion_templates = [
        f"As {topic} continues to evolve, staying informed and adaptable will be key to success. Organizations and individuals who proactively engage with these developments will be better positioned for the future.",
        f"The journey ahead for {topic} promises to be both challenging and rewarding. By understanding the key factors and maintaining a strategic approach, stakeholders can navigate this landscape effectively.",
        f"In conclusion, {topic} represents an important area for continued focus and development. The insights gained from this analysis can help inform better decision-making and strategic planning."
    ]
    
    return random.choice(conclusion_templates)


def extract_main_topic(title: str) -> str:
    """Extract the main topic from a title."""
    
    # Simple heuristic: look for content after common patterns
    patterns = ["—", ":", "Update:", "Latest in", "Analysis:", "Breaking:"]
    
    for pattern in patterns:
        if pattern in title:
            parts = title.split(pattern)
            if len(parts) > 1:
                topic = parts[-1].strip()
                # Clean up common prefixes/suffixes
                topic = topic.replace("A ", "").replace("The ", "")
                return topic
    
    # Fallback: use the full title but clean it up
    clean_title = title.replace("Trend #", "").replace("Breaking:", "")
    clean_title = " ".join(clean_title.split()[:3])  # First 3 words
    
    return clean_title.strip() or "Technology"


def extract_categories(title: str) -> List[str]:
    """Extract relevant categories from title content."""
    
    # Category mapping based on keywords
    category_keywords = {
        "Technology": ["tech", "technology", "ai", "artificial intelligence", "cloud", "computing", "software"],
        "Business": ["business", "market", "financial", "strategy", "leadership", "management"],
        "Innovation": ["innovation", "future", "emerging", "breakthrough", "disruption"],
        "Analysis": ["analysis", "insights", "trends", "data", "research"],
        "Industry": ["industry", "sector", "professional", "enterprise", "corporate"]
    }
    
    title_lower = title.lower()
    matched_categories = []
    
    for category, keywords in category_keywords.items():
        if any(keyword in title_lower for keyword in keywords):
            matched_categories.append(category)
    
    # Default categories if no matches
    if not matched_categories:
        matched_categories = ["General", "Industry News"]
    
    return matched_categories[:3]  # Limit to 3 categories


def main():
    """CLI entry point for testing content generation."""
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description='Test content generation')
    parser.add_argument('--title', required=True, help='Topic title')
    parser.add_argument('--angle', help='Topic angle/description')
    parser.add_argument('--score', type=float, default=0.5, help='Topic score (0.0-1.0)')
    parser.add_argument('--output', choices=['json', 'html'], default='json', 
                       help='Output format')
    
    args = parser.parse_args()
    
    # Create test topic
    topic = {
        'title': args.title,
        'angle': args.angle or f"Exploring {args.title} from multiple perspectives",
        'score': args.score
    }
    
    # Generate post
    result = generate_post(topic, 'default')
    post_data = result['post_data']
    metadata = result['metadata']
    
    if args.output == 'json':
        print(json.dumps({
            'post_data': post_data,
            'metadata': metadata
        }, indent=2))
    else:
        print(f"<h1>{post_data['title']}</h1>")
        print(post_data['content'])
        print(f"\n<!-- Categories: {', '.join(post_data['categories'])} -->")
        print(f"<!-- Generated using: {metadata['prompt_used']} -->")


if __name__ == '__main__':
    exit(main())
