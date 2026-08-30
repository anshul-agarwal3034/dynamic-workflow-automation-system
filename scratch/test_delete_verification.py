import uuid
from app.database import SessionLocal
from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.field import Field
from app.models.field_option import FieldOption
from app.models.submission import Submission
from app.models.response_value import ResponseValue
from app.models.user import User
from app.crud.form import create_form_with_version, delete_form
from app.crud.field import add_field_to_version, delete_field
from app.schemas.field import FieldCreate, FieldOptionCreate

def run_tests():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("No user found in DB to attach forms")
            return

        print("--- Test 1: Create form without submission and delete ---")
        form1 = create_form_with_version(db, title="Test Form Without Submissions", description="Testing clean delete", user_id=user.id)
        version1 = form1.versions[0]
        field1 = add_field_to_version(db, version_id=version1.id, field_data=FieldCreate(
            label="Name Question",
            field_type="text",
            placeholder="Type name...",
            is_required=True
        ))
        print(f"Created Form {form1.id} with Field {field1.id}")

        # Delete field individually first
        delete_field(db, field1)
        print("Successfully deleted individual field without submissions!")

        # Re-add a field and delete form
        field1_new = add_field_to_version(db, version_id=version1.id, field_data=FieldCreate(
            label="Email Question",
            field_type="email"
        ))
        delete_form(db, form1)
        print("Successfully deleted Form 1 without submissions!")

        print("\n--- Test 2: Create form WITH submissions and delete ---")
        form2 = create_form_with_version(db, title="Test Form WITH Submissions", description="Testing submission cascade delete", user_id=user.id)
        version2 = form2.versions[0]
        field2 = add_field_to_version(db, version_id=version2.id, field_data=FieldCreate(
            label="Select Choice",
            field_type="dropdown",
            options=[FieldOptionCreate(option_label="Option A", option_value="opt_a")]
        ))

        # Create submission and response_value
        sub = Submission(form_version_id=version2.id, completion_time_seconds=12)
        db.add(sub)
        db.flush()

        resp = ResponseValue(submission_id=sub.id, field_id=field2.id, value={"text": "Option A"})
        db.add(resp)
        db.commit()
        print(f"Created Form {form2.id} with Submission {sub.id} and ResponseValue {resp.id}")

        # Delete field with submission
        delete_field(db, field2)
        print("Successfully deleted field with existing submission & response_value!")

        # Add another field & submission, then delete form
        field2_new = add_field_to_version(db, version_id=version2.id, field_data=FieldCreate(label="Feedback", field_type="text"))
        sub2 = Submission(form_version_id=version2.id, completion_time_seconds=5)
        db.add(sub2)
        db.flush()
        resp2 = ResponseValue(submission_id=sub2.id, field_id=field2_new.id, value={"text": "Great service"})
        db.add(resp2)
        db.commit()

        delete_form(db, form2)
        print("Successfully deleted Form 2 WITH submissions & response values!")

        print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! ZERO 500 ERRORS!")

    except Exception as e:
        print(f"TEST FAILED WITH ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
