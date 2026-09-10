import uuid
import pytest
from app.services.validation_engine import validate_field_value, validate_submission_data


class DummyOption:
    def __init__(self, option_label: str, option_value: str):
        self.option_label = option_label
        self.option_value = option_value


class DummyField:
    def __init__(
        self,
        label: str,
        field_type: str,
        is_required: bool = False,
        validation_config: dict = None,
        options: list = None,
        field_id: str = None
    ):
        self.id = field_id or str(uuid.uuid4())
        self.label = label
        self.field_type = field_type
        self.is_required = is_required
        self.validation_config = validation_config or {}
        self.options = options or []


def test_text_length_bounds():
    # 1. Text length bounds: min 3, max 10
    field = DummyField(
        label="Username",
        field_type="text",
        is_required=True,
        validation_config={"min_length": 3, "max_length": 10}
    )

    # Too short
    err_short = validate_field_value(field, "ab")
    assert err_short is not None
    assert "at least 3 characters" in err_short

    # Too long
    err_long = validate_field_value(field, "abcdefghijkl")
    assert err_long is not None
    assert "cannot exceed 10 characters" in err_long

    # Valid
    assert validate_field_value(field, "valid_usr") is None


def test_number_bounds():
    # 2. Number bounds: age >= 18 and <= 60
    field = DummyField(
        label="Age",
        field_type="number",
        is_required=True,
        validation_config={"min_value": 18, "max_value": 60}
    )

    # Below min
    err_young = validate_field_value(field, 16)
    assert err_young is not None
    assert "at least 18" in err_young

    # Above max
    err_old = validate_field_value(field, 65)
    assert err_old is not None
    assert "cannot exceed 60" in err_old

    # Non-numeric
    err_nan = validate_field_value(field, "not_a_number")
    assert err_nan is not None
    assert "valid number" in err_nan

    # Valid
    assert validate_field_value(field, 25) is None
    assert validate_field_value(field, "30") is None


def test_email_validation():
    # 3. Email validation: rejects "notanemail", accepts "user@example.com"
    field = DummyField(
        label="Work Email",
        field_type="email",
        is_required=True
    )

    err_invalid = validate_field_value(field, "notanemail")
    assert err_invalid is not None
    assert "valid email address" in err_invalid

    assert validate_field_value(field, "user@example.com") is None
    assert validate_field_value(field, "test.name+tag@sub.domain.org") is None


def test_dropdown_validation():
    # 4. Dropdown validation: rejects unlisted option, accepts listed option
    field = DummyField(
        label="Department",
        field_type="dropdown",
        is_required=True,
        options=[
            DummyOption("Engineering", "eng"),
            DummyOption("Marketing", "mkt"),
            DummyOption("Sales", "sales")
        ]
    )

    err_unlisted = validate_field_value(field, "finance")
    assert err_unlisted is not None
    assert "invalid selection" in err_unlisted

    assert validate_field_value(field, "eng") is None
    assert validate_field_value(field, "sales") is None


def test_checkbox_multiselect_validation():
    # 5. Checkbox multi-select: validates list items against allowed options
    field = DummyField(
        label="Skills",
        field_type="checkbox",
        is_required=True,
        options=[
            DummyOption("Python", "python"),
            DummyOption("FastAPI", "fastapi"),
            DummyOption("React", "react")
        ],
        validation_config={"min_selected": 1, "max_selected": 2}
    )

    # Not a list
    err_type = validate_field_value(field, "python")
    assert err_type is not None
    assert "must be a list" in err_type

    # Unlisted selection
    err_unlisted = validate_field_value(field, ["python", "cobol"])
    assert err_unlisted is not None
    assert "invalid selection 'cobol'" in err_unlisted

    # Exceeds max_selected
    err_too_many = validate_field_value(field, ["python", "fastapi", "react"])
    assert err_too_many is not None
    assert "cannot have more than 2 options" in err_too_many

    # Valid
    assert validate_field_value(field, ["python", "fastapi"]) is None


def test_required_field_enforcement():
    # 6. Required field enforcement: flags empty required fields
    field = DummyField(
        label="Full Name",
        field_type="text",
        is_required=True
    )

    assert validate_field_value(field, None) == "Full Name is required."
    assert validate_field_value(field, "") == "Full Name is required."
    assert validate_field_value(field, "   ") == "Full Name is required."

    # Optional field allows empty
    opt_field = DummyField(
        label="Bio",
        field_type="text",
        is_required=False
    )
    assert validate_field_value(opt_field, None) is None
    assert validate_field_value(opt_field, "") is None

    # Conditionally required field flags empty
    assert validate_field_value(opt_field, "", is_conditionally_required=True) == "Bio is required."


def test_complete_submission_validation():
    # 7. Passing submission: all fields valid -> returns 0 errors
    field_text = DummyField("Username", "text", is_required=True, validation_config={"min_length": 3})
    field_email = DummyField("Email", "email", is_required=True)
    field_age = DummyField("Age", "number", is_required=True, validation_config={"min_value": 18})

    fields = [field_text, field_email, field_age]

    valid_payload = {
        "username": "alex",
        "email": "alex@example.com",
        "age": 28
    }

    res_valid = validate_submission_data(fields, valid_payload)
    assert res_valid.is_valid
    assert len(res_valid.errors) == 0
    assert len(res_valid) == 0
    assert bool(res_valid) is True

    # Invalid submission
    invalid_payload = {
        "username": "al",  # too short
        "email": "notanemail",
        "age": 15  # too young
    }

    res_invalid = validate_submission_data(fields, invalid_payload)
    assert not res_invalid.is_valid
    assert len(res_invalid.errors) == 3
    assert len(res_invalid) == 3
    assert bool(res_invalid) is False
    assert "Username" in res_invalid.errors["username"]
    assert "Email" in res_invalid.errors["email"]
    assert "Age" in res_invalid.errors["age"]


def test_conditional_coordination():
    # 8. Hidden field with value is flagged, conditionally required field is enforced
    field_experience = DummyField(
        "Experience",
        "dropdown",
        is_required=True,
        options=[DummyOption("Yes", "Yes"), DummyOption("No", "No")]
    )
    field_years = DummyField(
        "Years of Experience",
        "number",
        is_required=False
    )

    fields = [field_experience, field_years]

    class DummyRule:
        def __init__(self, trig_id, targ_id, op, comp, act):
            self.trigger_field_id = trig_id
            self.target_field_id = targ_id
            self.operator = op
            self.comparison_value = comp
            self.action = act

    # Rule: Experience equals "Yes" -> show Years of Experience
    rules = [DummyRule(field_experience.id, field_years.id, "equals", "Yes", "show")]

    # Submission with Experience="No" but Years="5" (hidden field has data)
    hidden_data_payload = {
        "experience": "No",
        "years_of_experience": 5
    }
    res_hidden = validate_submission_data(fields, hidden_data_payload, rules=rules)
    assert not res_hidden.is_valid
    assert any("hidden by conditional logic" in msg for msg in res_hidden.errors.values())

    # Submission with Experience="No" and no Years (valid)
    valid_no_payload = {
        "experience": "No"
    }
    res_no = validate_submission_data(fields, valid_no_payload, rules=rules)
    assert res_no.is_valid
    assert len(res_no.errors) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
