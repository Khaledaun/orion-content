import sys
import os
sys.path.insert(0, 'python')

from orion.api_client import client

# Set up config
os.environ['ORION_BASE_URL'] = 'http://localhost:3000'
os.environ['ORION_CONSOLE_TOKEN'] = 'your-bearer-token-here'

# Test GET /api/weeks
try:
    weeks = client._make_request('GET', '/api/weeks')
    print("Weeks response type:", type(weeks))
    print("Weeks response:", weeks)
    if isinstance(weeks, list) and weeks:
        print("First week type:", type(weeks[0]))
        print("First week:", weeks[0])
    elif isinstance(weeks, dict):
        print("Weeks keys:", list(weeks.keys()))
except Exception as e:
    print("Error:", e)
    import traceback
    traceback.print_exc()
