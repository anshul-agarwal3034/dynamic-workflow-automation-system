# FormPilotX ⚡

> **High-Performance Adaptive Form Engine & Real-Time Intake Telemetry Platform**  
> An enterprise-grade, privacy-conscious data collection and response intelligence platform. Engineered with an asynchronous FastAPI backend and a custom Ahead-of-Time (AOT) compiled React architecture, FormPilotX delivers sub-150ms First Contentful Paint, universal multilingual localization, and cryptographic intake audit trails.

---

## 📌 Problem Statement

Traditional web form builders and enterprise data intake workflows suffer from structural bottlenecks that hurt completion rates and compromise data integrity:

1. **Heavy Client Overhead:** Popular form engines rely on monolithic runtime bundles (loading heavy client interpreters and runtime Babel parsers), resulting in First Contentful Paint (FCP) times exceeding 4–8 seconds on mid-range or mobile networks.
2. **Brittle Verification & Intake Fraud:** Standard forms submit raw inputs without cryptographic tracking IDs or verifiable submission receipts, making audit confirmation and customer verification difficult.
3. **Language & Regional Inaccessibility:** Most platforms treat internationalization as an afterthought, lacking localized language accessibility tailored to multilingual regions.
4. **Desktop-Biased UX:** Tabular dashboards and complex multi-column form builders break on mobile viewports (`390px`), forcing awkward horizontal scrolling and degrading the respondent experience.
5. **Decoupled Telemetry:** Traditional platforms disconnect submission records from top-level aggregate KPIs, requiring manual querying to track drop-offs, completion rates, and answer distributions.

---

## 💡 The FormPilotX Solution

FormPilotX solves these challenges by combining a lightweight, compiled modular client with an asynchronous backend processing pipeline:

* **Sub-150ms Load Velocity:** Custom Node.js AOT compilation pre-bundles JSX components into isolated, dependency-free UMD/IIFE units, eliminating in-browser compilation entirely.
* **Instant Verifiable Intake Audits:** Every response generates an executive-grade intake audit card with cryptographic tracking references (`RESP-XXXXXX`) and client-side verifiable PDF receipts via `jsPDF`.
* **Deep Cross-View Hash Telemetry:** One-click contextual deep linking from top-level analytics straight into filtered submission records (`#/submissions?formId=...&ref=...`).
* **Universal 5-Language Engine:** Dot-notation internationalization supporting English (EN), Hindi (HI), Bengali (BN), Tamil (TA), and Telugu (TE) with zero runtime translation latency.
* **Mobile-First Adaptive Design:** Responsive 2×2 KPI matrices and touch-friendly card streams that eliminate horizontal scroll on any screen size.
* **Omnichannel Distribution Hub:** Real-time client-side vector QR code synthesis (`qrcode.min.js`) coupled with direct clipboard share links.

---

## 🔄 End-to-End System Workflow

```
[ Creator ]                                              [ Respondent ]
│                                                         │
▼                                                         ▼
┌─────────────────────────┐                               ┌─────────────────────────┐
│ Dynamic Form Builder    │                               │ Omnichannel Intake Hub  │
│ - Schema Palette        │ ── Public Share Link / QR ──▶ │ - Responsive Viewport   │
│ - Live Preview          │                               │ - 5-Language Switcher   │
│ - Versioning & State    │                               │ - Session Timer & State │
└────────────┬────────────┘                               └────────────┬────────────┘
             │                                                         │
             │ JSON Schema Definition                                  │ Form Submission
             ▼                                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                FastAPI Gateway Engine                             │
│  - Dynamic Origin & CORS Resolution (DevTunnels / Localhost / Custom Domains)     │
│  - Pydantic Schema Validation & Request Sanitization                              │
│  - JWT Bearer Authentication, Password Hashing (Bcrypt) & RBAC                    │
└─────────────────────────────┬─────────────────────────────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│     Persistence & Schema      │   │    Telemetry & Aggregation    │
│ - Forms & Question Nodes      │   │ - Completion Rates & Drop-offs│
│ - Submissions & Field Values  │   │ - Duration Tracking (Seconds) │
│ - SQLAlchemy + Alembic Migr.  │   │ - Distribution Breakdown      │
└──────────────┬────────────────┘   └───────────────┬───────────────┘
               │                                    │
               └──────────────────┬─────────────────┘
                                  ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                            Executive Intelligence Layer                           │
│  - Live Dashboard KPI Matrix (Submissions, Conversion, Avg Duration)              │
│  - Verifiable Snapshot Intake Cards (SSL Badge, Reference Hash, Duration)        │
│  - Client-Side Verifiable PDF Receipt Generator (jsPDF)                           │
│  - Raw Multi-Format Export Pipeline (Structured CSV / JSON Data Streams)          │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Technical Architecture

### 1. Backend Engine (FastAPI & Asynchronous Python)
* **Application Framework:** FastAPI running on Uvicorn ASGI with asynchronous route handlers.
* **Dynamic Origin Resolver:** Custom origin resolution automatically bridging local development (`localhost:8000`), local network IP access (`192.168.x.x`), and HTTPS developer tunnels (`*.devtunnels.ms`) without CORS preflight blocks.
* **Data Access Layer:** SQLAlchemy ORM with declarative schema models, paired with Alembic database migrations.
* **Security & Auth:** OAuth2 password bearer flow with JWT tokens, PBKDF2/Bcrypt password hashing, and role-based data isolation.

### 2. Frontend Architecture (AOT Compiled Modular React)
* **Zero-Babel Runtime Bundle:** Frontend components are written in idiomatic React/JSX and compiled Ahead-of-Time using a custom Node.js runner (`scripts/build_jsx.js`).
* **Atelier Obsidian Dark UI:** Clean dark aesthetic with utility-first layout principles, customized for data-heavy dashboard interfaces.
* **Universal Localization Core (`i18n.js`):** Lightweight, zero-dependency internationalization supporting recursive dot-notation keys (`nav.dashboard`, `dashboard.title`) across 5 languages with automatic fallback to English.

---

## 🗄️ Core Data Models

```
┌──────────────────────┐             ┌──────────────────────┐
│        User          │             │         Form         │
├──────────────────────┤             ├──────────────────────┤
│ id (PK)              │ 1         * │ id (PK)              │
│ email (Unique)       ├────────────▶│ user_id (FK)         │
│ hashed_password      │             │ title                │
│ full_name            │             │ description          │
│ created_at           │             │ is_published         │
└──────────────────────┘             │ version              │
                                     │ created_at           │
                                     └──────────┬───────────┘
                                                │ 1
                                                │
                                                │ *
                                     ┌──────────▼───────────┐
                                     │      Submission      │
                                     ├──────────────────────┤
                                     │ id (PK)              │
                                     │ form_id (FK)         │
                                     │ tracking_ref (Unique)│
                                     │ respondent_identifier│
                                     │ duration_seconds     │
                                     │ is_completed         │
                                     │ answers (JSONB)      │
                                     │ submitted_at         │
                                     └──────────────────────┘
```

---

## 🔌 Primary REST Endpoints

### Authentication & User Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/signup` | Register an administrative tenant account |
| `POST` | `/auth/signin` | Authenticate credentials and receive a bearer JWT |
| `GET` | `/auth/me` | Fetch active user identity, credentials, and role |

### Form Management & Schema
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/forms` | List all created forms with aggregate response counters |
| `POST` | `/forms` | Create a new form schema with dynamic field configurations |
| `GET` | `/forms/{id}` | Retrieve complete form schema definition |
| `PUT` | `/forms/{id}` | Update form settings, title, status, or fields |
| `DELETE` | `/forms/{id}` | Archive or remove form entity |

### Public Intake & Response Capture
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/public/forms/{id}` | Retrieve published form structure for respondents |
| `POST` | `/public/forms/{id}/submit` | Ingest public form submission, generate reference code |

### Analytics & Data Export
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/dashboard/summary` | Fetch top-level dashboard metrics (totals, completion rates) |
| `GET` | `/analytics/{form_id}` | Detailed question drop-off rates and value distributions |
| `GET` | `/submissions/{form_id}/export/csv` | Stream filtered form submission records as CSV |
| `GET` | `/submissions/{form_id}/export/json` | Export structured response payloads as JSON |

---

## 🛠️ Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Backend Core** | Python 3.11, FastAPI, Uvicorn, Pydantic |
| **Data & ORM** | SQLAlchemy, Alembic, PostgreSQL / SQLite |
| **Frontend Framework** | React 18, JSX, JavaScript (ES2022) |
| **Compilation Pipeline**| Custom Node.js AOT Transpiler, UMD Modular Architecture |
| **Styling & Theme** | Atelier Obsidian Dark UI, Tailwind CSS Utility Classes |
| **Client-Side Utilities**| jsPDF (Intake Receipts), QRCode.js (Vector QR Codes) |
| **Security & Routing** | Dynamic Origin Resolution, JWT Bearer Tokens, Hash Deep-Linking |

---

## 🚀 Quickstart & Installation

### Prerequisites
* Python 3.10+
* Node.js 18+
* Git

### 1. Clone & Set Up Python Environment
```bash
git clone https://github.com/anshul-agarwal3034/dynamic-workflow-automation-system.git
cd dynamic-workflow-automation-system
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Compile Frontend Assets (AOT Build)
```bash
node scripts/build_jsx.js
```

### 3. Run Backend Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The application is now live at:
* **Dashboard & Application:** [http://localhost:8000/app/public/index.html](http://localhost:8000/app/public/index.html)
* **Interactive API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔒 License
Distributed under the MIT License. See `LICENSE` for details.
