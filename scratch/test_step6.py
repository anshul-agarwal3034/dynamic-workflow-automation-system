import requests
import json
import jwt
import psycopg2
from app.config import settings

BASE_URL = "http://127.0.0.1:8000"

print("--- STEP 6.1: Call POST /auth/signup ---")
signup_payload = {
    "full_name": "Test User",
    "email": "testuser@example.com",
    "password": "Password123!"
}
res1 = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload)
print(f"Status Code: {res1.status_code}")
print(f"Response Body: {json.dumps(res1.json(), indent=2)}")

print("\n--- STEP 6.2: Query PostgreSQL directly ---")
conn = psycopg2.connect(settings.DATABASE_URL)
cur = conn.cursor()
cur.execute("SELECT id, full_name, email, password_hash, is_active, created_at FROM users WHERE email = %s", ("testuser@example.com",))
row = cur.fetchone()
print(f"User ID: {row[0]}")
print(f"Full Name: {row[1]}")
print(f"Email: {row[2]}")
print(f"Password Hash Prefix: {row[3][:10]}")
print(f"Full Password Hash: {row[3]}")
print(f"Is Active: {row[4]}")
print(f"Created At: {row[5]}")
conn.close()

print("\n--- STEP 6.3: Call POST /auth/signup with DUPLICATE email ---")
res3 = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload)
print(f"Status Code: {res3.status_code}")
print(f"Response Body: {json.dumps(res3.json(), indent=2)}")

print("\n--- STEP 6.4: Call POST /auth/signin with CORRECT password ---")
signin_payload = {
    "email": "testuser@example.com",
    "password": "Password123!"
}
res4 = requests.post(f"{BASE_URL}/auth/signin", json=signin_payload)
print(f"Status Code: {res4.status_code}")
print(f"Response Body: {json.dumps(res4.json(), indent=2)}")
token = res4.json().get("access_token")

print("\n--- STEP 6.5: Call POST /auth/signin with WRONG password ---")
wrong_payload = {
    "email": "testuser@example.com",
    "password": "WrongPassword999!"
}
res5 = requests.post(f"{BASE_URL}/auth/signin", json=wrong_payload)
print(f"Status Code: {res5.status_code}")
print(f"Response Body: {json.dumps(res5.json(), indent=2)}")

print("\n--- STEP 6.6: Decode JWT payload ---")
if token:
    decoded = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    print(f"Decoded JWT Payload: {json.dumps(decoded, indent=2)}")
