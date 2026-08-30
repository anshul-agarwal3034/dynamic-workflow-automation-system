# FormPilotX — Dynamic Form Engine & Lifecycle Management System

FormPilotX is a high-performance dynamic form platform built with a decoupled FastAPI backend, PostgreSQL relational storage, and a responsive React client. It supports immutable version freezing, live visual builder workflows, cascading field management, and unauthenticated public shareable links.

---

## Core Capabilities Implemented (Milestone 1)

### 🔐 Authentication & Security
- **JWT Bearer Authentication**: Secure token-based session handling.
- **Bcrypt Password Hashing**: Cryptographic password protection.
- **Automated Session Initialization**: Auto-login upon registration.
- **Route Guards & Session Purging**: Client-side authentication guards and complete local storage purging upon sign-out.

### 🎨 Interactive Form Builder Studio
- **Visual Question Canvas**: Supports text, number, email, dropdown, checkbox, date, and rating scale question types.
- **Modal Configuration**: Dedicated field configuration dialogs before appending questions to canvas.
- **In-Place Question Customization**: Inline field editing for labels, placeholders, requirement toggles, and choice options.
- **Field Reordering & Single Field Deletion**: Drag-and-drop / arrow reordering and direct SQL single field deletion.

### 📜 Immutable Version Snapshots
- **Publish Freezing (`POST /forms/{id}/publish`)**: Publishing freezes the active version (`is_active=True`, `published_at=now`).
- **Automated Draft Branching**: Edits to a published form automatically clone schema details into a new draft version (`version_number + 1`).
- **Historical Version Inspection**: View snapshot details and field schema across previous version iterations.

### 🌐 Public Access & Lifecycle Management
- **Unauthenticated Public Links**: Respondents can access forms via unique, shareable URL slugs (`/pages/react-app.html#/public/forms/<share_slug>`).
- **Real-Time Validation Schema**: Dynamically builds form UI and enforces validation on response submission.
- **Full Archive Protection**: Archived forms freeze state and return `HTTP 410 Gone` on public submission attempts.
- **Unarchive Workflow**: Restores archived forms back to active or draft state.

### 🗄️ Enterprise Data Management
- **Fail-Proof Cascade Deletion**: Parameterized direct SQL deletion executing across dependent tables in strict topological order (`response_values` → `submissions` → `conditional_rules` → `field_options` → `fields` → `form_versions` → `forms`).

### ⚡ Curated 1-Click Templates
- Single-click loaders for *Employee Onboarding*, *Customer Feedback Survey*, and *Event Registration* with canvas replacement safeguards.

---

## Database Architecture & Schema

The database consists of 8 normalized relational entities configured on PostgreSQL:

| Table Name | Description | Key Relationships / Foreign Keys |
| :--- | :--- | :--- |
| `users` | User identity & credentials | Primary key `id` (UUID), linked to `forms.created_by`. |
| `forms` | Master form entity & status (`draft`, `published`, `archived`) | Foreign key `created_by` → `users.id`, has many `form_versions`. |
| `form_versions` | Immutable schema version snapshots & version counters | Foreign key `form_id` → `forms.id`, has many `fields`, `submissions`. |
| `fields` | Dynamic question elements with JSONB validation configs | Foreign key `form_version_id` → `form_versions.id`, has many `field_options`, `response_values`. |
| `field_options` | Choice rows for dropdown, radio, and checkbox fields | Foreign key `field_id` → `fields.id`. |
| `conditional_rules` | Rule entity linking trigger and target fields | Foreign keys `trigger_field_id` & `target_field_id` → `fields.id`. |
| `submissions` | Respondent submission master with session timing metrics | Foreign key `form_version_id` → `form_versions.id`, has many `response_values`. |
| `response_values` | Normalized field response values in JSONB format | Foreign keys `submission_id` → `submissions.id`, `field_id` → `fields.id`. |

---

## API Endpoints Reference Table

### 🔑 Authentication Routes
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | Register a new user account | Public |
| `POST` | `/auth/signin` | Authenticate user and issue JWT token | Public |
| `GET` | `/auth/me` | Fetch authenticated user profile details | Bearer Token |

### 📝 Form Management Routes
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/forms` | List all forms owned by current user | Bearer Token |
| `POST` | `/forms` | Create a new form and initial draft version | Bearer Token |
| `GET` | `/forms/{id}` | Retrieve form details, versions, and active fields | Bearer Token |
| `PUT` | `/forms/{id}` | Update form title and description | Bearer Token |
| `DELETE` | `/forms/{id}` | Direct cascade delete form and all child records | Bearer Token |
| `PATCH` | `/forms/{id}/archive` | Archive a form (freezes form, returns 410 on public submit) | Bearer Token |
| `PATCH` | `/forms/{id}/unarchive` | Restore an archived form to active/draft state | Bearer Token |
| `POST` | `/forms/{id}/publish` | Publish active draft version & generate public slug | Bearer Token |
| `POST` | `/forms/{id}/generate-link` | Generate shareable public URL for published form | Bearer Token |

### 🛠️ Field Management Routes
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/forms/{id}/fields` | Add a new field to active draft version | Bearer Token |
| `PUT` | `/fields/{id}` | Update field label, placeholder, requirement, or options | Bearer Token |
| `DELETE` | `/fields/{id}` | Delete individual field and dependent responses/rules | Bearer Token |
| `PATCH` | `/forms/{id}/reorder-fields` | Update display order of questions on canvas | Bearer Token |

### 🌐 Public & System Routes
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Application health and database connectivity check | Public |
| `GET` | `/public/forms/{slug}` | Retrieve public form schema for respondent viewing | Public |
| `POST` | `/public/forms/{slug}/submit` | Submit responses for a published form | Public |
| `GET` | `/forms/{id}/versions` | List historical versions for a form | Bearer Token |
| `GET` | `/forms/{id}/versions/{v_id}` | View detailed snapshot of a specific historical version | Bearer Token |

---

## Local Setup & Execution Guide

### Prerequisites
- **Python 3.10+**
- **PostgreSQL 14+**

### Configuration (`.env`)
Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://postgres:3034@localhost:5432/dynamic_workflow_db
JWT_SECRET_KEY=a4df5d050c5f54e45853c6a1ccff97a6569fc0deee659f8e9bc4f257145fb30b
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```

### Backend Startup
Install Python dependencies and start the Uvicorn application server:
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Application Access
Open a web browser and navigate to:
```text
http://127.0.0.1:8000/pages/react-app.html
```

### Health Check Verification
Verify backend API and PostgreSQL database health:
```text
http://127.0.0.1:8000/health
```
**Expected Response:**
```json
{
  "application": "running",
  "database": "connected"
}
```
