import sys
import os
sys.path.insert(0, 'python')

from orion.api_client import client

# Set up config
os.environ['ORION_BASE_URL'] = 'http://localhost:3000'
os.environ['ORION_CONSOLE_TOKEN'] = 'your-bearer-token-here'

# Test the API response
try:
    week = client.ensure_week('my-site')
    print("Week response type:", type(week))
    print("Week response keys:", list(week.keys()) if isinstance(week, dict) else "Not a dict")
    print("Week response:", week)
except Exception as e:
    print("Error:", e)
    import traceback
    traceback.print_exc()
