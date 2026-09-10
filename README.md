# Dynamic Form Builder (FormPilotX)

An enterprise-ready, dynamic form-building and workflow management platform featuring dynamic conditional rule evaluation, server-side schema validations, zero-build CDN React frontend, safe transactional persistence, and secure file streaming.

**Repository:** [https://github.com/anshul-agarwal3034/dynamic-workflow-automation-system](https://github.com/anshul-agarwal3034/dynamic-workflow-automation-system)

---

## 🌟 Key Feature Highlights (Milestones 1 & 2)

### 🔐 Authentication & Security
- **JWT Bearer Token Authentication:** Secure, stateless token-based session handling with configurable expiration.
- **Bcrypt Password Hashing:** Robust cryptographic password protection using salted bcrypt hashing.
- **Automated Session Initialization:** Immediate auto-login upon user registration for friction-free onboarding.
- **Client-Side Route Guards:** Centralized routing guards protecting builder, form detail, and dashboard views, with complete local storage purging upon sign-out.

### 🎨 Interactive Form Builder Studio
- **Visual Question Canvas:** Interactive drag-and-drop and ordered question layout supporting 8 core question types:
  - Text & Long Text (Textarea)
  - Number & Rating Scale
  - Email
  - Dropdown, Radio, & Checkbox
  - Date Picker
  - File Upload
- **Preview-Safe Canvas Controls:** Interactive inputs are rendered preview-only on the builder canvas to prevent accidental interactions during form editing.
- **In-Place Customization & Modals:** Intuitive configuration modals and inline editing for field labels, placeholders, requiredness toggles, and choice options.
- **Clean Default Options:** Seamless option creation that initializes empty with placeholder text or auto-selects defaults on focus for rapid typing.

### 🛡️ Field Validation Configuration
- **Visual Validation Constraints:** Form creators can visually configure field constraints in the builder UI that automatically persist to `field.validation_config` (JSONB) in PostgreSQL:
  - **Text / Textarea:** Minimum length (`min_length`), maximum length (`max_length`), and regular expression patterns (`regex_pattern`).
  - **Number:** Minimum numeric value (`min_value`) and maximum numeric value (`max_value`).
  - **File Upload:** Maximum file size in megabytes (`max_size_mb`) and allowed extension whitelists (`allowed_extensions`).
- **Strict Server-Side Enforcement:** Validation engine (`app/services/validation_engine.py`) rigorously validates submission values against field configurations before database writes, returning informative 422 HTTP responses with field-specific errors.

### ⚡ Conditional Logic Evaluation Engine
- **Visual Rule Builder:** Creators can configure dynamic triggers and targets directly in the Form Builder:
  - **Operators:** `equals`, `not_equals`, `contains`, `greater_than`, `is_empty`.
  - **Target Actions:** `show` (reveal field when condition met), `hide` (conceal field when condition met), and `require` (dynamically enforce mandatory completion).
- **Client-Side Dependency Graph:** `PublicFormView.jsx` dynamically recalculates field visibility and requirement states in real time as respondents enter data.
- **Dynamic Question Numbering:** Public respondent view automatically calculates and renders 1-based question numbers dynamically (`Q1`, `Q2`, `Q3`...), skipping currently hidden fields in real time as conditions change.
- **Server-Side Submission Integrity:** `app/services/conditional_engine.py` evaluates active rules against submission payloads to reject or discard unauthorized data for hidden fields and enforce dynamically required fields.

### 📜 Immutable Version Snapshots & Draft Cloning
- **Publish Freezing (`POST /forms/{id}/publish`):** Publishing freezes the active form version (`is_active=True`, `published_at=now`) and generates a persistent public slug.
- **Automated Draft Branching:** Any edits to a published form trigger `ensure_draft_version`, which clones all fields, options, and conditional rules into a new draft version (`version_number + 1`) while safely re-mapping foreign keys.
- **Historical Version Inspection:** Full API support to inspect version history, field schemas, and snapshots across iterations.
- **Archive & Unarchive Lifecycle:** Complete lifecycle management allowing forms to be archived (freezing public submissions with `HTTP 410 Gone`) and unarchived back to draft or active state.

### 💾 Safe Form Submissions & Relational Storage
- **Transactional Submission Pipeline (`POST /public/forms/{slug}/submit`):** Atomic persistence storing respondent submissions and individual response values across `submissions` and `response_values` tables.
- **Duration Metrics:** Accurately captures respondent start timestamp, completion timestamp, and overall completion duration in seconds.
- **Submission Reference Confirmation:** Respondents receive an instant confirmation screen displaying their unique submission reference ID.

### 📁 Secure File Storage & Streaming
- **Controlled File Uploads (`POST /upload`):** Upload validation verifying allowed extensions, MIME types, and file size limits (default 10MB).
- **Isolated Storage:** Uploaded files are assigned UUID filenames and stored securely within the local `./uploads/` directory.
- **Secure File Streaming (`GET /files/{file_id}`):** Streamlined retrieval endpoint delivering files with proper `Content-Type` headers, streaming responses, and safe download attachments.

### 📊 Creator Submissions Dashboard
- **Submissions Overview (`GET /forms/{id}/submissions`):** Real-time analytics view for form creators displaying respondent submissions, duration metrics, submission timestamps, and answered values.
- **Direct File Inspection:** Seamless integration allowing creators to directly view and download respondent-submitted files.

---

## 🏗️ Tech Stack & Architecture

- **Backend:**
  - **Language:** Python 3.14+
  - **API Framework:** FastAPI
  - **ORM & Database Toolkit:** SQLAlchemy 2.0
  - **Data Validation & Serialization:** Pydantic V2 (`ConfigDict(from_attributes=True)`)
  - **Database:** PostgreSQL (`formpilotx_db`)
- **Frontend:**
  - **Architecture:** Zero-build CDN architecture — no Node.js, npm, or build tools required.
  - **Libraries:** React 18, Babel Standalone, Tailwind CSS.
  - **Routing:** Hash-based SPA routing (`SimpleRouter.jsx`).
- **Storage & Infrastructure:**
  - **Local Disk Storage:** `./uploads/` directory for uploaded file payloads.
  - **Relational Integrity:** Cascading foreign key relationships with parameterized transactional safety.

---

## 🗄️ Database Architecture & Schema

The PostgreSQL database (`formpilotx_db`) is composed of 9 normalized relational entities:

| Table Name | Description | Key Relationships & Foreign Keys |
| :--- | :--- | :--- |
| `users` | User accounts and cryptographic credentials | Primary key `id` (UUID), referenced by `forms.created_by`. |
| `forms` | Master form entity, lifecycle status (`draft`, `published`, `archived`) | Foreign key `created_by` → `users.id`, has many `form_versions`. |
| `form_versions` | Immutable schema version snapshots & version counters | Foreign key `form_id` → `forms.id`, has many `fields`, `submissions`. |
| `fields` | Dynamic question definitions with JSONB validation configs | Foreign key `form_version_id` → `form_versions.id`, has many `field_options`, `response_values`. |
| `field_options` | Choice rows for dropdown, radio, and checkbox fields | Foreign key `field_id` → `fields.id`. |
| `conditional_rules` | Logical rule entity linking trigger and target fields | Foreign keys `trigger_field_id` & `target_field_id` → `fields.id`. |
| `submissions` | Respondent submission master record with duration metrics | Foreign key `form_version_id` → `form_versions.id`, has many `response_values`. |
| `response_values` | Normalized field response values in JSONB format | Foreign keys `submission_id` → `submissions.id`, `field_id` → `fields.id`. |
| `uploaded_files` | File metadata, storage paths, and content types | Primary key `id` (UUID), links stored files to fields/submissions. |

---

## 📡 API Endpoints Reference

### 🔑 Authentication Routes
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | Register a new user account & auto-initialize session | Public |
| `POST` | `/auth/signin` | Authenticate user credentials and issue JWT bearer token | Public |
| `GET` | `/auth/me` | Fetch authenticated user profile details | Bearer Token |

### 📝 Form Management & Versioning Routes
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/forms` | List all forms owned by current user | Bearer Token |
| `POST` | `/forms` | Create a new form with an initial draft version | Bearer Token |
| `GET` | `/forms/{id}` | Retrieve form details, active version, and fields | Bearer Token |
| `PUT` | `/forms/{id}` | Update form title and description | Bearer Token |
| `DELETE` | `/forms/{id}` | Direct cascade deletion of form and all associated child entities | Bearer Token |
| `POST` | `/forms/{id}/publish` | Publish active draft version & generate public share slug | Bearer Token |
| `GET` | `/forms/{id}/versions` | List historical versions for a form | Bearer Token |
| `GET` | `/forms/{id}/versions/{version_id}` | View detailed snapshot of a specific historical version | Bearer Token |
| `POST` | `/forms/{id}/generate-link` | Generate or fetch shareable public URL for published form | Bearer Token |
| `PATCH` | `/forms/{id}/archive` | Archive a form (freezes form, returns 410 on public submit) | Bearer Token |
| `PATCH` | `/forms/{id}/unarchive` | Restore an archived form to active/draft state | Bearer Token |

### 🛠️ Field Management Routes
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/forms/{id}/fields` | Add a new field to active draft version | Bearer Token |
| `PUT` | `/fields/{id}` | Update field label, placeholder, requirement, or options | Bearer Token |
| `DELETE` | `/fields/{field_id}` | Delete individual field and dependent responses/rules | Bearer Token |
| `PATCH` | `/forms/{id}/reorder-fields` | Update display order of questions on builder canvas | Bearer Token |

### ⚡ Conditional Rules Routes
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/forms/{id}/rules` | Create a new conditional logic rule for a form | Bearer Token |
| `GET` | `/forms/{id}/rules` | List all conditional rules for the form's active version | Bearer Token |
| `PUT` | `/rules/{rule_id}` | Update an existing conditional rule's configuration | Bearer Token |
| `DELETE` | `/rules/{rule_id}` | Delete a conditional rule | Bearer Token |

### 📁 File Upload & Streaming Routes
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/upload` | Upload a file with size, type, and extension validation | Public |
| `GET` | `/files/{file_id}` | Securely stream an uploaded file with inline/attachment headers | Public |

### 📊 Submissions & Public Form Routes
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/public/forms/{slug}` | Retrieve public form schema for respondent viewing | Public |
| `POST` | `/public/forms/{slug}/submit` | Submit form responses with conditional and field validation | Public |
| `GET` | `/forms/{form_id}/submissions` | View all respondent submissions and analytics for a form | Bearer Token |
| `GET` | `/health` | System health and database connectivity check | Public |

---

## 📁 Project Directory Structure

```text
Dynamic_Form_Builder/
├── app/                        # Backend Application Source Code
│   ├── api/                    # Route Definitions & API Dependencies
│   │   ├── routes/             # Endpoints: auth, forms, public, files
│   │   └── deps.py             # Auth dependencies & database session injection
│   ├── core/                   # Security utilities (JWT, password hashing)
│   ├── crud/                   # Database CRUD operations & draft cloning logic
│   ├── models/                 # SQLAlchemy ORM models (9 relational tables)
│   ├── schemas/                # Pydantic V2 validation schemas
│   ├── services/               # Business logic engines:
│   │   ├── conditional_engine.py   # Conditional rule evaluation
│   │   └── validation_engine.py    # Field constraints validation
│   ├── database.py             # SQLAlchemy engine & session maker
│   └── main.py                 # FastAPI application factory & route registration
├── frontend/                   # Zero-Build CDN Frontend SPA
│   ├── public/
│   │   └── index.html          # Single HTML entrypoint loading React 18 & Tailwind CDN
│   └── src/
│       ├── api/                # API client (`formsApi.js`)
│       └── components/         # React Components (FormBuilder, PublicFormView, etc.)
├── uploads/                    # Local Disk Directory for Uploaded Files
├── scratch/                    # Automated Test Suites & Verification Scripts
├── requirements.txt            # Python Dependencies Specification
├── README.md                   # Project Documentation
└── .env                        # Environment Configuration Variables
```

---

## 🚀 Getting Started & Local Setup

### 1. Prerequisites
- **Python 3.10+** (Python 3.14 recommended)
- **PostgreSQL 14+** running locally or remotely

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://postgres:3034@localhost:5432/formpilotx_db
JWT_SECRET_KEY=a4df5d050c5f54e45853c6a1ccff97a6569fc0deee659f8e9bc4f257145fb30b
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```

### 3. Virtual Environment & Dependencies
```bash
# Create and activate a Python virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

# Install required packages
pip install -r requirements.txt
```

### 4. Database Setup
Ensure PostgreSQL is active and create the database:
```sql
CREATE DATABASE formpilotx_db;
```
*(All tables are automatically created on backend startup via SQLAlchemy metadata reflection).*

### 5. Running the Application
Start the Uvicorn ASGI server:
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 6. Accessing the Frontend
Open your browser and navigate to:
```text
http://127.0.0.1:8000/app/public/index.html
```
*(The root route `http://127.0.0.1:8000/` also redirects directly to the frontend application).*

---

## 🧪 Automated Testing

Execute the comprehensive test suites across draft cloning, publishing pipelines, conditional logic, and Milestone 2 features using `pytest`:

```bash
# Run Milestone 2 full test suite
python -m pytest scratch/test_milestone2_completion.py -v

# Run draft cloning and publishing flow tests
python -m pytest scratch/test_draft_cloning.py scratch/test_publish_flow.py -v

# Run all test suites in scratch/
python -m pytest scratch/ -v
```
