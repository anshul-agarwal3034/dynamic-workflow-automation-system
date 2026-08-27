import requests
import json
import psycopg2
from app.config import settings

BASE_URL = "http://127.0.0.1:8000"
NEW_EMAIL = "bugfix001@example.com"

print("--- STEP 5.1: Real UI Signup Request to /auth/signup ---")
payload = {
    "full_name": "BugFix User",
    "email": NEW_EMAIL,
    "password": "Password123!"
}
res = requests.post(f"{BASE_URL}/auth/signup", json=payload)
print(f"Status Code: {res.status_code}")
print(f"Response Body: {json.dumps(res.json(), indent=2)}")

print("\n--- STEP 5.2: Query PostgreSQL for Created Row ---")
conn = psycopg2.connect(settings.DATABASE_URL)
cur = conn.cursor()
cur.execute("SELECT id, full_name, email, password_hash, is_active, created_at FROM users WHERE email = %s", (NEW_EMAIL,))
row = cur.fetchone()
if row:
    print(f"DB Row Found!")
    print(f"User ID: {row[0]}")
    print(f"Full Name: {row[1]}")
    print(f"Email: {row[2]}")
    print(f"Password Hash Prefix: {row[3][:10]}")
    print(f"Full Password Hash: {row[3]}")
    print(f"Is Active: {row[4]}")
    print(f"Created At: {row[5]}")
else:
    print("DB Row NOT Found!")
conn.close()

print("\n--- STEP 5.3: Duplicate Email Check ---")
res_dup = requests.post(f"{BASE_URL}/auth/signup", json=payload)
print(f"Status Code: {res_dup.status_code}")
print(f"Response Body: {json.dumps(res_dup.json(), indent=2)}")
