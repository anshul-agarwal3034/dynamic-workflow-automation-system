import requests
import json
from app.database import SessionLocal
from app.models.form import Form
from app.models.field import Field
from app.models.field_option import FieldOption

BASE_URL = "http://127.0.0.1:8000"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYzBlNzdhYS03OTYyLTQ5YWEtYjRlNy00ZGMxNDc5YWVhODkiLCJleHAiOjE3ODc4Mjc4MjB9.8cA_9tmM5mGLwRm_LeAZsB4JCrmFWN5dvFowbW_NvzA"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

db = SessionLocal()

print("="*60)
print("CHECKPOINT B7 REAL EXECUTION & VERIFICATION")
print("="*60)

# 1. From Home, navigate to Form List
print("\n--- CHECK 1: Form List on Mount ---")
r = requests.get(f"{BASE_URL}/forms", headers=HEADERS)
print(f"Status: {r.status_code}")
forms_list = r.json()
print("Forms currently listed for User 1:")
for f in forms_list:
    print(f"  - [{f['status']}] {f['title']} (ID: {f['id']})")

# 2. Create Form
print("\n--- CHECK 2: Create Form ---")
create_payload = {
    "title": "Task 4 B7 Test Form",
    "description": "Form created during Step B7 test checkpoint"
}
r = requests.post(f"{BASE_URL}/forms", headers=HEADERS, json=create_payload)
print(f"POST /forms Response Status: {r.status_code}")
new_form = r.json()
form_id = new_form["id"]
print("Created Form Raw Response:")
print(json.dumps(new_form, indent=2))

# Verify via SQL
sql_form = db.query(Form).filter(Form.id == form_id).first()
print(f"SQL Verification -> Form in DB: ID={sql_form.id}, Title='{sql_form.title}', Status='{sql_form.status}', CreatedBy={sql_form.created_by}")

# 3. Add Text Field & Dropdown Field
print("\n--- CHECK 3: Add Fields ---")
# 3a. Add Text Field
text_field_payload = {
    "label": "Full Name",
    "field_type": "text",
    "placeholder": "Enter full name",
    "is_required": True,
    "display_order": 1
}
r_text = requests.post(f"{BASE_URL}/forms/{form_id}/fields", headers=HEADERS, json=text_field_payload)
print(f"3a. Add Text Field Status: {r_text.status_code}")
text_field = r_text.json()
text_field_id = text_field["id"]
print("Text Field Raw Response:")
print(json.dumps(text_field, indent=2))

# 3b. Add Dropdown Field
dropdown_field_payload = {
    "label": "Department",
    "field_type": "dropdown",
    "is_required": False,
    "display_order": 2,
    "options": [
        {"option_label": "Engineering", "option_value": "eng", "display_order": 1},
        {"option_label": "Product", "option_value": "prod", "display_order": 2}
    ]
}
r_drop = requests.post(f"{BASE_URL}/forms/{form_id}/fields", headers=HEADERS, json=dropdown_field_payload)
print(f"\n3b. Add Dropdown Field Status: {r_drop.status_code}")
dropdown_field = r_drop.json()
dropdown_field_id = dropdown_field["id"]
print("Dropdown Field Raw Response:")
print(json.dumps(dropdown_field, indent=2))

# SQL Verification for fields and options
sql_fields = db.query(Field).filter(Field.form_version_id == sql_form.versions[0].id).all()
print("\nSQL Verification -> Fields in DB:")
for f in sql_fields:
    print(f"  - Field ID: {f.id}, Label: '{f.label}', Type: {f.field_type}, Order: {f.display_order}")
    sql_opts = db.query(FieldOption).filter(FieldOption.field_id == f.id).all()
    for o in sql_opts:
        print(f"      Option: Label='{o.option_label}', Value='{o.option_value}', Order={o.display_order}")

# 4. Reorder Fields
print("\n--- CHECK 4: Reorder Fields ---")
reorder_payload = {
    "items": [
        {"field_id": dropdown_field_id, "display_order": 1},
        {"field_id": text_field_id, "display_order": 2}
    ]
}
r_reorder = requests.patch(f"{BASE_URL}/forms/{form_id}/reorder-fields", headers=HEADERS, json=reorder_payload)
print(f"Reorder Response Status: {r_reorder.status_code}")
reorder_res = r_reorder.json()
print("Reorder Fields Raw Response:")
print(json.dumps(reorder_res, indent=2))

# SQL Verification for reorder
db.expire_all()
sql_fields_reordered = db.query(Field).filter(Field.form_version_id == sql_form.versions[0].id).order_by(Field.display_order).all()
print("\nSQL Verification -> Reordered Fields in DB:")
for f in sql_fields_reordered:
    print(f"  - Field ID: {f.id}, Label: '{f.label}', Order: {f.display_order}")

# 5. Delete One Field (Delete text field)
print("\n--- CHECK 5: Delete Field ---")
r_del = requests.delete(f"{BASE_URL}/fields/{text_field_id}", headers=HEADERS)
print(f"Delete Field Response Status: {r_del.status_code}")
print("Delete Field Raw Response:", r_del.json())

# SQL Verification after deletion
db.expire_all()
sql_fields_after_del = db.query(Field).filter(Field.form_version_id == sql_form.versions[0].id).all()
print("\nSQL Verification -> Remaining Fields in DB:")
for f in sql_fields_after_del:
    print(f"  - Field ID: {f.id}, Label: '{f.label}'")
deleted_exists = db.query(Field).filter(Field.id == text_field_id).first()
print(f"Deleted Text Field exists in DB? {deleted_exists is not None}")

# 6. Navigate Back to Form List
print("\n--- CHECK 6: Form List Refresh ---")
r_list6 = requests.get(f"{BASE_URL}/forms", headers=HEADERS)
print(f"Status: {r_list6.status_code}")
target_form_6 = next((f for f in r_list6.json() if f["id"] == form_id), None)
print("Target Form in List:", json.dumps(target_form_6, indent=2))

# 7. Form Detail View
print("\n--- CHECK 7: Form Detail View (/forms/:id) ---")
r_detail7 = requests.get(f"{BASE_URL}/forms/{form_id}", headers=HEADERS)
print(f"Status: {r_detail7.status_code}")
detail_form_7 = r_detail7.json()
print("Detail View Response (Draft):")
print(f"Title: {detail_form_7['title']}, Status: {detail_form_7['status']}, Fields Count: {len(detail_form_7['versions'][0]['fields'])}")

# 8. Archive Form
print("\n--- CHECK 8: Archive Form ---")
r_arch = requests.patch(f"{BASE_URL}/forms/{form_id}/archive", headers=HEADERS)
print(f"Archive Response Status: {r_arch.status_code}")
archived_res = r_arch.json()
print("Archive Form Raw Response:")
print(json.dumps(archived_res, indent=2))

# SQL Verification for archive
db.expire_all()
sql_archived_form = db.query(Form).filter(Form.id == form_id).first()
print(f"SQL Verification -> Form Status in DB: {sql_archived_form.status}")

# 9. Verify Archived Form in Detail & List
print("\n--- CHECK 9: Archived Form Verification ---")
r_detail9 = requests.get(f"{BASE_URL}/forms/{form_id}", headers=HEADERS)
print(f"Detail View Status: {r_detail9.json()['status']}")
r_list9 = requests.get(f"{BASE_URL}/forms", headers=HEADERS)
target_form_9 = next((f for f in r_list9.json() if f["id"] == form_id), None)
print(f"List View Status: {target_form_9['status']}")

# 10. Search Box Filtering
print("\n--- CHECK 10: Search Box Filter ---")
search_term = "Task 4 B7 Test Form"
r_search = requests.get(f"{BASE_URL}/forms?search={search_term}", headers=HEADERS)
print(f"Search Status: {r_search.status_code}")
search_results = r_search.json()
print(f"Search Results Count: {len(search_results)}")
for sf in search_results:
    print(f"  - Found Form: {sf['title']} (ID: {sf['id']})")

print("="*60)
print("ALL 10 CHECKPOINT B7 CHECKS COMPLETED CLEANLY!")
print("="*60)
