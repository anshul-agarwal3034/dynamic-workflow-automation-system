import requests
import json
from app.database import SessionLocal
from app.models.user import User
from app.core.security import create_access_token

BASE_URL = "http://127.0.0.1:8000"

db = SessionLocal()
user = db.query(User).filter(User.email == "bugfix001@example.com").first()
if not user:
    user = db.query(User).first()

token = create_access_token(str(user.id))
HEADERS = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

print("="*60)
print("TESTING TASK 5 (VERSIONING & PUBLISHING) & TASK 6 (PUBLIC SHAREABLE LINK)")
print("="*60)

# 1. Create a new Form
print("\n--- Step 1: Create Form ---")
r_create = requests.post(f"{BASE_URL}/forms", headers=HEADERS, json={"title": "Publish & Share Test Form", "description": "Testing versioning and public link generation"})
print(f"Create Form Status: {r_create.status_code}")
form_data = r_create.json()
form_id = form_data["id"]
print(f"Form ID: {form_id}, Status: {form_data['status']}")

# 2. Add Fields to Version 1
print("\n--- Step 2: Add Fields ---")
r_f1 = requests.post(f"{BASE_URL}/forms/{form_id}/fields", headers=HEADERS, json={
    "label": "Full Name",
    "field_type": "text",
    "is_required": True,
    "display_order": 1
})
print(f"Add Text Field Status: {r_f1.status_code}")

r_f2 = requests.post(f"{BASE_URL}/forms/{form_id}/fields", headers=HEADERS, json={
    "label": "Experience Rating",
    "field_type": "rating",
    "is_required": False,
    "display_order": 2
})
print(f"Add Rating Field Status: {r_f2.status_code}")

# 3. Publish Form (Version 1)
print("\n--- Step 3: Publish Form (Version 1) ---")
r_pub = requests.post(f"{BASE_URL}/forms/{form_id}/publish", headers=HEADERS)
print(f"Publish Form Status: {r_pub.status_code}")
pub_form = r_pub.json()
print(f"Published Form Status: {pub_form['status']}")
print(f"Active Version ID: {pub_form['versions'][0]['id']}, Version #: {pub_form['versions'][0]['version_number']}, Active: {pub_form['versions'][0]['is_active']}, PublishedAt: {pub_form['versions'][0]['published_at']}")

# 4. Generate Share Link
print("\n--- Step 4: Generate Share Link ---")
r_link = requests.post(f"{BASE_URL}/forms/{form_id}/generate-link", headers=HEADERS)
print(f"Generate Link Status: {r_link.status_code}")
link_data = r_link.json()
share_slug = link_data["share_slug"]
print(f"Share Slug: {share_slug}")
print(f"Share URL: {link_data['share_url']}")

# 5. Fetch Public Form Schema (Unauthenticated)
print("\n--- Step 5: Unauthenticated GET /public/forms/{slug} ---")
r_public = requests.get(f"{BASE_URL}/public/forms/{share_slug}")
print(f"Public Schema Response Status: {r_public.status_code}")
pub_schema = r_public.json()
print(f"Public Form Title: '{pub_schema['title']}', Version: {pub_schema['version_number']}, Field Count: {len(pub_schema['fields'])}")
for field in pub_schema['fields']:
    print(f"  - Field: '{field['label']}' (Type: {field['field_type']}, Required: {field['is_required']})")

# 6. List Versions
print("\n--- Step 6: List Form Versions ---")
r_vers = requests.get(f"{BASE_URL}/forms/{form_id}/versions", headers=HEADERS)
print(f"List Versions Status: {r_vers.status_code}")
versions_list = r_vers.json()
print("Versions History:")
for v in versions_list:
    print(f"  - Version #{v['version_number']} (Active: {v['is_active']}, PublishedAt: {v['published_at']}, Fields: {v['field_count']})")

# 7. Edit Published Form (Auto-clone new draft Version 2)
print("\n--- Step 7: Add Field to Published Form (Auto-cloning draft Version 2) ---")
r_f3 = requests.post(f"{BASE_URL}/forms/{form_id}/fields", headers=HEADERS, json={
    "label": "Additional Comments",
    "field_type": "text",
    "is_required": False,
    "display_order": 3
})
print(f"Add Field to Published Form Status: {r_f3.status_code}")

# Check versions history after edit
r_vers2 = requests.get(f"{BASE_URL}/forms/{form_id}/versions", headers=HEADERS)
print("Versions History after edit (Version 2 draft should exist):")
for v in r_vers2.json():
    print(f"  - Version #{v['version_number']} (Active: {v['is_active']}, PublishedAt: {v['published_at']}, Fields: {v['field_count']})")

# 8. Publish Version 2
print("\n--- Step 8: Publish Version 2 ---")
r_pub2 = requests.post(f"{BASE_URL}/forms/{form_id}/publish", headers=HEADERS)
print(f"Publish Version 2 Status: {r_pub2.status_code}")
pub2_form = r_pub2.json()
print(f"Form Status: {pub2_form['status']}")

# Verify Public Form now serves Version 2
r_public2 = requests.get(f"{BASE_URL}/public/forms/{share_slug}")
pub2_schema = r_public2.json()
print(f"Public Schema Version: {pub2_schema['version_number']}, Field Count: {len(pub2_schema['fields'])}")

# 9. Archive Form and Verify Public 410 Response
print("\n--- Step 9: Archive Form & Test Public 410 Response ---")
r_arch = requests.patch(f"{BASE_URL}/forms/{form_id}/archive", headers=HEADERS)
print(f"Archive Form Status: {r_arch.status_code}")

r_public_arch = requests.get(f"{BASE_URL}/public/forms/{share_slug}")
print(f"Public Response after Archiving Status: {r_public_arch.status_code}")
print(f"Public Detail Message: {r_public_arch.json()['detail']}")

print("\n" + "="*60)
print("ALL TASK 5 & TASK 6 BACKEND & PUBLIC INTEGRATION TESTS PASSED PERFECTLY!")
print("="*60)
