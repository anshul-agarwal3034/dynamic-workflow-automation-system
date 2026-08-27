import requests
import json
import psycopg2
from app.config import settings

BASE_URL = "http://127.0.0.1:8000"

print("--- STEP 8.1: Sign up a NEW test user ('Jane Smith', 'janesmith@example.com') ---")
signup_payload = {
    "full_name": "Jane Smith",
    "email": "janesmith@example.com",
    "password": "SecurePassword456!"
}
res1 = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload)
print(f"Status Code: {res1.status_code}")
print(f"Response Body: {json.dumps(res1.json(), indent=2)}")

# Verify row in PostgreSQL
conn = psycopg2.connect(settings.DATABASE_URL)
cur = conn.cursor()
cur.execute("SELECT id, full_name, email, password_hash, created_at FROM users WHERE email = %s", ("janesmith@example.com",))
row = cur.fetchone()
print(f"DB Row - ID: {row[0]}")
print(f"DB Row - Name: {row[1]}")
print(f"DB Row - Email: {row[2]}")
print(f"DB Row - Password Hash Prefix: {row[3][:10]}")
print(f"DB Row - Full Password Hash: {row[3]}")
conn.close()

print("\n--- STEP 8.2: Try signing up with SAME email again ---")
res2 = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload)
print(f"Status Code: {res2.status_code}")
print(f"Response Body: {json.dumps(res2.json(), indent=2)}")

print("\n--- STEP 8.3: Sign in with the new user ---")
signin_payload = {
    "email": "janesmith@example.com",
    "password": "SecurePassword456!"
}
res3 = requests.post(f"{BASE_URL}/auth/signin", json=signin_payload)
print(f"Status Code: {res3.status_code}")
print(f"Response Body: {json.dumps(res3.json(), indent=2)}")
token = res3.json().get("access_token")

print("\n--- STEP 8.4: Confirm Home profile fetch with JWT (GET /auth/me) ---")
res4 = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {token}"})
print(f"Status Code: {res4.status_code}")
print(f"Response Body: {json.dumps(res4.json(), indent=2)}")

print("\n--- STEP 8.5: Log out / Try GET /auth/me without token ---")
res5 = requests.get(f"{BASE_URL}/auth/me")
print(f"Status Code: {res5.status_code}")
print(f"Response Body: {json.dumps(res5.json(), indent=2)}")
