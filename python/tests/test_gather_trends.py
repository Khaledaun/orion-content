
"""Tests for gather_trends module."""

import pytest
from unittest.mock import Mock, patch
from datetime import date

from orion.gather_trends import generate_topic_title, generate_topics_for_site


class TestGatherTrends:
    """Test suite for gather_trends functionality."""
    
    def test_generate_topic_title_uniqueness(self):
        """Test that topic titles are unique."""
        used_titles = set()
        category_name = "Technology"
        
        # Generate multiple titles
        titles = []
        for _ in range(10):
            title = generate_topic_title(category_name, used_titles)
            assert title not in used_titles
            used_titles.add(title)
            titles.append(title)
        
        assert len(titles) == len(set(titles))  # All unique
    
    def test_generate_topic_title_contains_category(self):
        """Test that generated titles contain category name."""
        category_name = "AI"
        used_titles = set()
        
        title = generate_topic_title(category_name, used_titles)
        
        # Should contain category name
        assert category_name in title
    
    def test_generate_topics_for_site_distribution(self):
        """Test topic distribution across categories."""
        site = {
            'id': 'site1',
            'key': 'test-site',
            'categories': [
                {'id': 'cat1', 'name': 'Technology'},
                {'id': 'cat2', 'name': 'Business'},
                {'id': 'cat3', 'name': 'AI'}
            ]
        }
        
        topics = generate_topics_for_site(site, 9)  # 3 per category
        
        assert len(topics) == 9
        
        # Check distribution
        category_counts = {}
        for topic in topics:
            cat_id = topic['categoryId']
            category_counts[cat_id] = category_counts.get(cat_id, 0) + 1
        
        # Should be evenly distributed
        assert all(count == 3 for count in category_counts.values())
    
    def test_generate_topics_for_site_required_fields(self):
        """Test that generated topics have required fields."""
        site = {
            'id': 'site1',
            'key': 'test-site',
            'categories': [
                {'id': 'cat1', 'name': 'Technology'}
            ]
        }
        
        topics = generate_topics_for_site(site, 2)
        
        for topic in topics:
            # Check required fields from API schema
            assert 'siteId' in topic
            assert 'categoryId' in topic
            assert 'title' in topic
            assert 'angle' in topic
            assert 'score' in topic
            assert 'approved' in topic
            
            # Check types and values
            assert topic['siteId'] == 'site1'
            assert topic['categoryId'] == 'cat1'
            assert isinstance(topic['title'], str)
            assert len(topic['title']) > 0
            assert isinstance(topic['score'], (int, float))
            assert 0 <= topic['score'] <= 1
            assert topic['approved'] is False  # Default to not approved
    
    def test_generate_topics_for_site_no_categories(self):
        """Test handling of site with no categories."""
        site = {
            'id': 'site1',
            'key': 'test-site',
            'categories': []
        }
        
        topics = generate_topics_for_site(site, 5)
        
        assert topics == []
    
    def test_generate_topics_for_site_uneven_distribution(self):
        """Test topic distribution with uneven numbers."""
        site = {
            'id': 'site1',
            'key': 'test-site',
            'categories': [
                {'id': 'cat1', 'name': 'Technology'},
                {'id': 'cat2', 'name': 'Business'},
                {'id': 'cat3', 'name': 'AI'}
            ]
        }
        
        topics = generate_topics_for_site(site, 10)  # 10 topics, 3 categories
        
        assert len(topics) == 10
        
        # Check that all categories get at least 3 topics
        category_counts = {}
        for topic in topics:
            cat_id = topic['categoryId']
            category_counts[cat_id] = category_counts.get(cat_id, 0) + 1
        
        # Should have 4, 3, 3 distribution (or similar)
        counts = sorted(category_counts.values())
        assert counts == [3, 3, 4]
    
    def test_topic_titles_are_unique_within_batch(self):
        """Test that topics within a batch have unique titles."""
        site = {
            'id': 'site1',
            'key': 'test-site',
            'categories': [
                {'id': 'cat1', 'name': 'Technology'}
            ]
        }
        
        topics = generate_topics_for_site(site, 20)
        
        titles = [topic['title'] for topic in topics]
        assert len(titles) == len(set(titles))  # All unique
    
    @patch('orion.gather_trends.random.choice')
    @patch('orion.gather_trends.random.randint')
    @patch('orion.gather_trends.random.uniform')
    def test_deterministic_generation_with_mocks(self, mock_uniform, mock_randint, mock_choice):
        """Test topic generation with mocked randomness."""
        mock_choice.side_effect = [
            "Tech Trend #{num:02d} — {subject}",  # Template
            "Edge Computing"  # Subject
        ]
        mock_randint.return_value = 42
        mock_uniform.return_value = 0.75
        
        site = {
            'id': 'site1',
            'key': 'test-site',
            'categories': [
                {'id': 'cat1', 'name': 'Technology'}
            ]
        }
        
        topics = generate_topics_for_site(site, 1)
        
        assert len(topics) == 1
        topic = topics[0]
        assert "Tech Trend #42 — Edge Computing" in topic['title']
        assert topic['score'] == 0.75
