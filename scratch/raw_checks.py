import requests
import json
import psycopg2
from app.config import settings

BASE_URL = "http://127.0.0.1:8000"

def raw_http(res):
    lines = []
    reason = "Created" if res.status_code == 201 else ("OK" if res.status_code == 200 else "Conflict" if res.status_code == 409 else "Unauthorized" if res.status_code == 401 else "Unprocessable Entity")
    lines.append(f"HTTP/1.1 {res.status_code} {reason}")
    for k, v in res.headers.items():
        lines.append(f"{k.lower()}: {v}")
    lines.append("")
    lines.append(res.text)
    return "\n".join(lines)

print("=== CHECK 1 ===")
res1 = requests.post(f"{BASE_URL}/auth/signup", json={
    "full_name": "Verify Test",
    "email": "verifytest001@example.com",
    "password": "TestPass123"
})
print(raw_http(res1))

print("\n=== CHECK 2 ===")
conn = psycopg2.connect(settings.DATABASE_URL)
cur = conn.cursor()
cur.execute("SELECT id, email, password_hash, created_at FROM users WHERE email = 'verifytest001@example.com'")
row = cur.fetchone()
print(f"id                                   | email                  | password_hash                                                | created_at")
print(f"-------------------------------------+------------------------+--------------------------------------------------------------+------------------------------")
print(f"{row[0]} | {row[1]} | {row[3]} | {row[2]}")
conn.close()

print("\n=== CHECK 3 ===")
res3 = requests.post(f"{BASE_URL}/auth/signup", json={
    "full_name": "Verify Test",
    "email": "verifytest001@example.com",
    "password": "TestPass123"
})
print(raw_http(res3))

print("\n=== CHECK 4 ===")
res4 = requests.post(f"{BASE_URL}/auth/signin", json={
    "email": "verifytest001@example.com",
    "password": "TestPass123"
})
print(raw_http(res4))
token = res4.json().get("access_token")

print("\n=== CHECK 5 ===")
res5 = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {token}"})
print(raw_http(res5))

print("\n=== CHECK 6 ===")
res6 = requests.post(f"{BASE_URL}/auth/signin", json={
    "email": "verifytest001@example.com",
    "password": "WrongPassword"
})
print(raw_http(res6))
