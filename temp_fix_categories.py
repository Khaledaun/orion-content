import sys
import os
sys.path.insert(0, 'python')

from orion.api_client import client
from orion.gather_trends import generate_topic_title

# Set up config
os.environ['ORION_BASE_URL'] = 'http://localhost:3000'
os.environ['ORION_CONSOLE_TOKEN'] = 'your-bearer-token-here'

# Test topic generation with mock category
site = {
    'id': 'cmevh80xw00058w173f382f2e',
    'key': 'my-site', 
    'categories': [
        {'id': 'mock-cat-1', 'name': 'Technology'}
    ]
}

# Generate a few topic titles to test
used_titles = set()
for i in range(5):
    title = generate_topic_title('Technology', used_titles)
    used_titles.add(title)
    print(f"{i+1}. {title}")
