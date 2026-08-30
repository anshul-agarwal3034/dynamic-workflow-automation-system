import requests

BASE_URL = "http://127.0.0.1:8000"

def run_unarchive_test():
    print("=" * 60)
    print("TESTING UNARCHIVE FORM API ENDPOINT")
    print("=" * 60)

    # 1. Sign in to get token
    res = requests.post(f"{BASE_URL}/auth/signin", json={"email": "demo@formpilotx.com", "password": "Password123!"})
    if res.status_code != 200:
        requests.post(f"{BASE_URL}/auth/signup", json={"full_name": "Demo User", "email": "demo@formpilotx.com", "password": "Password123!"})
        res = requests.post(f"{BASE_URL}/auth/signin", json={"email": "demo@formpilotx.com", "password": "Password123!"})
    
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create form
    create_res = requests.post(f"{BASE_URL}/forms", json={"title": "Unarchive Test Form"}, headers=headers)
    form_id = create_res.json()["id"]
    print(f"1. Created Form ID: {form_id}, Status: {create_res.json()['status']}")

    # 3. Add field
    requests.post(f"{BASE_URL}/forms/{form_id}/fields", json={"label": "Sample Question", "field_type": "text"}, headers=headers)

    # 4. Archive form
    arch_res = requests.patch(f"{BASE_URL}/forms/{form_id}/archive", headers=headers)
    print(f"2. Archived Form Status: {arch_res.json()['status']}")
    assert arch_res.json()['status'] == 'archived'

    # 5. Unarchive form
    unarch_res = requests.patch(f"{BASE_URL}/forms/{form_id}/unarchive", headers=headers)
    if unarch_res.status_code != 200:
        print("Unarchive Error:", unarch_res.status_code, unarch_res.text)
    print(f"3. Unarchived Form Status: {unarch_res.json()['status']}")
    assert unarch_res.json()['status'] == 'draft'

    # 6. Publish, Archive, Unarchive -> should restore to 'published'
    pub_res = requests.post(f"{BASE_URL}/forms/{form_id}/publish", headers=headers)
    print(f"4. Published Form Status: {pub_res.json()['status']}")
    assert pub_res.json()['status'] == 'published'

    arch_res2 = requests.patch(f"{BASE_URL}/forms/{form_id}/archive", headers=headers)
    print(f"5. Archived Published Form Status: {arch_res2.json()['status']}")

    unarch_res2 = requests.patch(f"{BASE_URL}/forms/{form_id}/unarchive", headers=headers)
    print(f"6. Unarchived Published Form Status: {unarch_res2.json()['status']}")
    assert unarch_res2.json()['status'] == 'published'

    print("\n" + "=" * 60)
    print("ALL UNARCHIVE ENDPOINT TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_unarchive_test()
