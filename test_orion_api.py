#!/usr/bin/env python3
import requests
import json

# Configuration
ORION_BASE_URL = "http://localhost:3000"
ORION_CONSOLE_TOKEN = "test-bearer-token-123"

def test_orion_api():
    # Set up headers
    headers = {"Authorization": f"Bearer {ORION_CONSOLE_TOKEN}"}
    
    print("�� Testing Orion API with Python...")
    
    # Test health endpoint
    print("\n1. Health Check:")
    health_response = requests.get(f"{ORION_BASE_URL}/api/health")
    print(f"Status: {health_response.status_code}")
    print(f"Response: {health_response.json()}")
    
    # Test sites API
    print("\n2. Sites API:")
    sites_response = requests.get(f"{ORION_BASE_URL}/api/sites", headers=headers)
    print(f"Status: {sites_response.status_code}")
    print(f"Response: {json.dumps(sites_response.json(), indent=2)}")
    
    # Test weeks API
    print("\n3. Weeks API:")
    weeks_response = requests.get(f"{ORION_BASE_URL}/api/weeks", headers=headers)
    print(f"Status: {weeks_response.status_code}")
    print(f"Response: {json.dumps(weeks_response.json(), indent=2)}")
    
    # Test creating a site
    print("\n4. Creating a new site:")
    new_site_data = {
        "key": "python-test-site",
        "name": "Python Test Site",
        "timezone": "UTC"
    }
    create_response = requests.post(
        f"{ORION_BASE_URL}/api/sites", 
        headers={**headers, "Content-Type": "application/json"},
        json=new_site_data
    )
    print(f"Status: {create_response.status_code}")
    print(f"Response: {json.dumps(create_response.json(), indent=2)}")

if __name__ == "__main__":
    test_orion_api()
