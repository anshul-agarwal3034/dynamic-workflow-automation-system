# FormPilotX

**Enterprise-grade dynamic form orchestration, respondent intelligence, and response analytics platform.**

FormPilotX is a full-stack engine for building forms whose *structure* is data — versioned, conditionally logical, and analyzed — rather than static markup. It pairs an async FastAPI backend with a modular, AOT-compiled React frontend, and is built around a simple premise: a form is a living schema with a lifecycle, not a one-shot document.

---

## The Problem

Tools like Google Forms are fine for a quick survey, but they break down the moment a real organization needs to:

- **Change a form without breaking old data.** Editing a live form's fields in most builders silently corrupts the meaning of responses collected before the edit — there's no concept of "this response belongs to version 3 of the form."
- **Express real business logic.** "Only ask for years of experience if the applicant said yes to having experience" is a one-line requirement that most form tools can't express without a plugin, a workaround, or custom code.
- **Enforce validation on the server, not just the browser.** Client-side-only validation is trivial to bypass; a form that accepts a hidden field's value anyway, or lets a required field through empty, isn't actually enforcing its own rules.
- **See past the raw response list.** Knowing *that* someone submitted a form is different from knowing *where* people drop off, *how long* it takes to complete, or *what* the field-by-field answer distribution looks like.

FormPilotX is built specifically around these gaps: forms are versioned snapshots (not mutable documents), conditional logic is evaluated server-side at submission time (not just hidden with CSS), every field can carry real validation rules, and every published form comes with a dashboard, not just a spreadsheet of raw rows.

---

## End-to-End Workflow

```
┌─────────────────┐
│  Form Creator    │
└────────┬─────────┘
         │ builds schema: fields, types, validation rules, conditional logic
         ▼
┌─────────────────────────┐
│  Draft Form (mutable)    │
└────────┬─────────────────┘
         │ Publish
         ▼
┌─────────────────────────────┐
│  Immutable Form Version      │  ← existing responses always stay linked
│  (fields + rules frozen)     │     to the exact version they were
└────────┬──────────────────────┘   submitted against
         │ shareable public link
         ▼
┌─────────────────────────┐
│  Respondent fills form   │
│  (conditional fields     │
│   show/hide live)        │
└────────┬─────────────────┘
         │ Submit
         ▼
┌───────────────────────────────────────┐
│  Server-side validation & rule engine   │
│  - re-evaluates conditional rules       │
│  - rejects values for hidden fields     │
│  - enforces conditionally-required      │
│  - validates type/format/range          │
└────────┬─────────────────────────────────┘
         │ valid
         ▼
┌─────────────────────────┐
│  Submission + per-field   │  → unique response reference returned
│  response values stored   │     to the respondent
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Admin Telemetry & Response Management    │
│  - completion rate, avg. time, drop-off   │
│  - field-level distributions              │
│  - filter / search / paginate responses   │
│  - CSV / JSON export                      │
└─────────────────────────────────────────┘
```

---

## Table of Contents

1. [Form Lifecycle & Builder Studio](#1-form-lifecycle--builder-studio)
2. [Omnichannel Distribution & Share Hub](#2-omnichannel-distribution--share-hub)
3. [Respondent Experience & Verification](#3-respondent-experience--verification)
4. [Submission Inspection & Deep Telemetry](#4-submission-inspection--deep-telemetry)
5. [Analytics & Multi-Format Export Engine](#5-analytics--multi-format-export-engine)
6. [Platform Architecture & Performance](#6-platform-architecture--performance)
7. [Tech Stack](#7-tech-stack)
8. [Setup & Running Locally](#8-setup--running-locally)

---

## 1. Form Lifecycle & Builder Studio

Every form moves through an explicit state machine rather than being a single mutable document. This is what lets old responses stay meaningfully linked to the exact schema they were submitted against, even after a form is edited and republished.

| State | Behavior |
|---|---|
| **Draft** | Fully editable — fields, validation, and conditional rules can be freely added, removed, and reordered. |
| **Published** | Structure is frozen into an immutable version snapshot. Editing a published form opens a new draft rather than mutating the live version, so existing responses remain correctly attributed. |
| **Paused** | Intake temporarily suspended without archiving the form — respondents see a clear "not currently accepting responses" state instead of a broken or missing form. |

**Builder-level detail work:**

| Feature | Description |
|---|---|
| **8+ field types** | Short text, long text / textarea, number, dropdown (single-select), multi-select checkboxes, radio groups, date, star rating, and file upload. |
| **Granular validation** | Per-field rules — min/max length, numeric range, regex pattern matching, required toggle — configured at build time and enforced identically on both client and server. |
| **Visual conditional logic** | Rule builder for *"if [field] [operator] [value] → [show / hide / require] [target field]"*, using `equals`, `not_equals`, `contains`, `greater_than`, and `is_empty` operators. |
| **Live preview** | Toggleable side-by-side preview pane rendering the form exactly as a respondent will see it, updating as fields are added or reordered. |
| **Auto-closing intake** | Forms can be configured with a scheduled close date/time or a maximum response cap; once either threshold is hit, the public intake view automatically switches to a clean "Submissions Closed" state rather than silently failing. |
| **Builder state preservation** | In-progress edits in the builder are preserved against accidental navigation/reload, rather than being lost on an accidental tab close. |

---

## 2. Omnichannel Distribution & Share Hub

Publishing a form is only useful if getting it in front of respondents is frictionless. The share hub covers link, QR, and direct-preview distribution from one modal:

| Feature | Description |
|---|---|
| **Vector QR generation** | In-modal QR code rendered client-side (`qrcode.min.js`), regenerated in real time from the form's live public URL, with a direct download option. |
| **One-click link copy** | Copies the public form URL to the clipboard with immediate toast confirmation, no page navigation required. |
| **Live preview launcher** | Opens the actual respondent-facing form in a new tab in one click, so a creator can sanity-check the real experience before sharing it. |

---

## 3. Respondent Experience & Verification

The public-facing intake experience is designed around giving respondents confidence that their submission was actually received and recorded correctly:

| Feature | Description |
|---|---|
| **Tracking reference generation** | Every successful submission is issued a unique reference code (format `RESP-XXXXXX`), copyable in one click, that a respondent can quote if they need to follow up. |
| **Downloadable PDF receipt** | Client-side PDF generation (`jsPDF`) producing a receipt with submission timestamp, tracking reference, and a summary of the submitted answers — generated entirely in-browser, no server round-trip required. |
| **Session velocity tracking** | Submission duration is tracked to the second from the moment the form is opened, feeding directly into the admin-side average-completion-time analytics. |
| **5-language runtime localization** | Full UI translation across English, Hindi, Bengali, Tamil, and Telugu via a lightweight dot-notation i18n engine (`i18n.js`), with instant zero-refresh language switching and the chosen language persisted in `localStorage` across sessions. |
| **Multi-step progress indication** | Forms with multiple logical sections render a progress bar reflecting how far into the form the respondent currently is. |

---

## 4. Submission Inspection & Deep Telemetry

The admin-side response view is built for actually working with response data, not just listing it:

| Feature | Description |
|---|---|
| **Intake audit modal** | Per-submission detail view with a verification status badge (verified/secure intake vs. an in-progress/incomplete submission), surfacing at a glance whether a given response should be trusted as complete. |
| **Deep-linkable submission views** | Hash-based routing (`#/submissions?formId=...&ref=...`) that, on load, mounts the submissions view, applies the correct form filter, and opens the exact submission modal referenced — so a specific response can be bookmarked or shared as a direct link. |
| **Responsive dual-mode layout** | Desktop renders a sortable multi-column table; the same view collapses to stacked, touch-friendly cards at mobile widths (tested down to a 390px viewport) rather than forcing horizontal scroll. |

---

## 5. Analytics & Multi-Format Export Engine

| Feature | Description |
|---|---|
| **KPI dashboard** | Responsive 2×2 summary grid — total submissions, active forms, conversion rate, and average completion duration — recalculated per form. |
| **Field-level distributions** | Visualizations of answer distribution per field: histograms for rating fields, frequency breakdowns for categorical (dropdown/radio/checkbox) fields. |
| **CSV export** | One-click streaming export of a form's full response set to CSV, with column headers matched to the form's actual field labels. |
| **JSON export** | Structured JSON export of the same response set, suited for programmatic downstream use. |

---

## 6. Platform Architecture & Performance

**Backend — FastAPI (async)**

- **Framework:** FastAPI on Uvicorn, async route handlers throughout.
- **Data layer:** SQLAlchemy ORM over PostgreSQL. Structural entities (forms, fields, users, submissions) are proper relational tables with real foreign keys and `ON DELETE` constraints; per-field validation configuration and submitted answers use `JSONB`, since a form's shape is defined by its own schema rather than a fixed database column set.
- **Versioning model:** `forms` (mutable draft metadata) → `form_versions` (immutable snapshot, created on publish) → `fields` (scoped to a specific version, never mutated post-publish).
- **Service layer separation:** Conditional-rule evaluation, field validation, analytics aggregation, and export generation each live in dedicated service modules rather than inline in route handlers — route files stay thin, and each engine is independently testable.
- **Auth:** JWT bearer tokens with `bcrypt` password hashing; every mutating endpoint enforces ownership so a user can only act on forms they created.

**Frontend — Modular AOT-Compiled React**

- **Build pipeline:** A custom Node.js transpiler (`scripts/build_jsx.js`) compiles JSX source into standalone UMD units ahead of time, so the browser loads pre-compiled components directly instead of paying an in-browser Babel-transform cost on every page load.
- **Routing:** Lightweight custom hash-based router with deep-link support, avoiding a heavier routing dependency for what is fundamentally a single-page admin app.
- **Design system:** Dark-themed, utility-first styling tuned for data-dense dashboard views, with layouts built to avoid horizontal scroll at mobile widths.
- **PWA support:** Installable via `manifest.json`, with a service worker (`sw.js`) caching static assets for offline shell availability.

---

## 7. Tech Stack

| Domain | Technologies |
|---|---|
| **Backend Core** | Python, FastAPI, Uvicorn, Pydantic |
| **Data & ORM** | SQLAlchemy, PostgreSQL, JSONB for dynamic schema/validation data |
| **Auth & Security** | JWT bearer tokens, bcrypt password hashing, ownership-scoped authorization |
| **Frontend Framework** | React (JSX), custom hash-based routing |
| **Build Pipeline** | Custom Node.js AOT JSX transpiler → UMD bundles |
| **Client-Side Utilities** | `jsPDF` (intake receipts), `qrcode.min.js` (vector QR generation) |
| **PWA** | Web App Manifest, Service Worker asset caching |
| **Localization** | Custom dot-notation i18n engine, 5 languages, `localStorage` persistence |

---

## 8. Setup & Running Locally

### Prerequisites
- Python 3.10+
- PostgreSQL
- Node.js (for the frontend build step)

### 1. Clone and set up the backend

\`\`\`bash
git clone https://github.com/anshul-agarwal3034/dynamic-workflow-automation-system.git
cd dynamic-workflow-automation-system

python -m venv .venv
# Windows:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
\`\`\`

### 2. Configure environment variables

\`\`\`bash
cp .env.example .env
\`\`\`

Set at minimum a `DATABASE_URL` pointing at your PostgreSQL instance and a `JWT_SECRET_KEY`.

### 3. Build the frontend

\`\`\`bash
node scripts/build_jsx.js
\`\`\`

### 4. Run the backend

\`\`\`bash
python -m uvicorn app.main:app --reload --port 8000
\`\`\`

The application is now available at:

- **App:** http://127.0.0.1:8000/app/public/index.html
- **Interactive API docs (Swagger):** http://127.0.0.1:8000/docs

---

## License

MIT