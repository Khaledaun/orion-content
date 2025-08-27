import os, json, requests

# Read secrets from GitHub Actions environment
base = os.environ["WP_BASE_URL_TRAVELUK"].rstrip("/")
user = os.environ["WP_USER_TRAVELUK"]
pw   = os.environ["WP_APP_PASSWORD_TRAVELUK"]

# Create a test draft post in WordPress
r = requests.post(f"{base}/wp-json/wp/v2/posts",
    auth=(user, pw),
    headers={"Content-Type":"application/json"},
    data=json.dumps({
        "title": "Orion test draft",
        "content": "<p>Hello from Actions.</p>",
        "status": "draft"
    })
)
r.raise_for_status()
print("Draft created:", r.json().get("link"))
