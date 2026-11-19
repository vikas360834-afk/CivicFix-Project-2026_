# CivicFix – Civic Issue Reporting & Management System

CivicFix is a modern full-stack civic issue reporting, verification, and grievance redressal system. Citizens report civic issues (potholes, garbage, broken streetlights, water leakage, pipeline leaks…), administrators review, verify, and dispatch work orders, and municipal ward engineers execute field repairs with verifiable photo proof.

The platform includes an automated NLP triage classifier, an interactive Leaflet map with clustering and heatmap layers, a live-database AI assistant, role-scoped analytics charts, and an emerald-green liquid glassmorphism design system.

---

## 🚀 Key Highlights (v2.0.0 Upgrade)

- **Three-Tier Role Model:** Clean separation into `USER` (Citizen reporter), `ADMIN` (Approves & dispatches), and `ENGINEER` (Executes field repairs).
- **Strict 5-Stage Issue Lifecycle:** `PENDING_APPROVAL` ➔ `OPEN` (Admin approved) ➔ `ASSIGNED` (Engineer assigned) ➔ `IN_PROGRESS` (Field work started) ➔ `RESOLVED` (Completed with note & after-photo proof). Illegal status jumps are rejected with `409 Conflict`.
- **Duplicate Detection:** Automatic geographical clustering flags duplicate reports submitted within ~100 meters and 14 days.
- **Secure Endpoints:** All `/api/issues`, `/api/issues/:id`, `/api/stats/*`, and comment routes require JWT authentication (`401 Unauthorized` without a token). Public registration is restricted to `USER` accounts only.
- **Isolated Public Feed:** Resolved and pending issues are completely filtered out from public feeds and maps; resolved issues remain accessible in reporter Profiles, Admin Archive, and Dashboard analytics.
- **Role-Aware AI Chatbot:** Scored intent router backed by live Prisma aggregation queries (counts, SLAs, backlog age buckets, hotspots, ward comparisons) with 56 automated test cases.
- **Emerald Liquid Glassmorphism:** CSS variable-based design system with morphing fluid blobs, specular highlights, and accessibility fallbacks.

---

## 💻 Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS 4, React Router 6, Axios, Recharts, Leaflet, Leaflet MarkerCluster & Heat.
- **Backend:** Node.js (ES Modules), Express, Prisma ORM, SQLite, JSON Web Tokens (JWT), bcryptjs, express-validator, multer.
- **AI Engine:** Regex/NLP category and priority classifier + modular chat service (`knowledge.js`, `context.js`, `queries.js`, `intents.js`, `formatter.js`).

---

## 👥 Demo Accounts (Seeded Data)

The database is pre-seeded with 50 users and 140 realistic issues across 12 Bengaluru wards. Use the quick demo buttons on the Login page:

| Role | Email | Password | Default Redirect | Permissions & Capabilities |
|------|-------|----------|------------------|----------------------------|
| **Citizen (User)** | `user@civicfix.in` | `user123` | `/issues` | Submit reports, upload evidence, upvote, comment, track lifecycle in Profile |
| **Administrator** | `admin@civicfix.in` | `admin123` | `/admin` | Verify pending reports, bulk approve, reject with reason, assign engineers, user roles |
| **Ward Engineer** | `engineer@civicfix.in` | `engineer123` | `/engineer` | View assigned work orders, start work, mark resolved with mandatory note & after-photo |

*Additional demo ward engineers:* `engineer.water@civicfix.in`, `engineer.roads@civicfix.in`, `engineer.electrical@civicfix.in` (password: `engineer123`).

---

## 📋 Issue Lifecycle & Workflow

```
[Citizen submits report]
           │
           ▼
   PENDING_APPROVAL ────(Admin Rejects with Reason)────► REJECTED (Archived)
           │
     (Admin Approves)
           │
           ▼
         OPEN
           │
     (Admin Assigns to Engineer)
           │
           ▼
       ASSIGNED
           │
     (Engineer Starts Work)
           │
           ▼
      IN_PROGRESS
           │
     (Engineer Marks Resolved + After-Photo)
           │
           ▼
       RESOLVED (Archived / Profile proof)
```

Every transition generates an immutable row in `IssueStatusHistory` recording:
`{ issueId, fromStatus, toStatus, changedById, note, createdAt }`.

---

## 🛠️ Setup Instructions (Local Development)

### Prerequisites
- Node.js (v18+ or v20+)
- Windows PowerShell: note that PowerShell blocks `npm.ps1` by default on some systems; use `npm.cmd` and `npx.cmd`.

### 1. Backend Setup
```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env     # or ensure DATABASE_URL="file:./dev.db" & JWT_SECRET
npx.cmd prisma db push
node seed.js                    # seeds 50 users, 140 geotagged issues & history
npm.cmd start                   # runs API server at http://localhost:5000
```

### 2. Frontend Setup
```powershell
# In a separate terminal
cd frontend
npm.cmd install
npm.cmd run dev                 # runs Vite dev server at http://localhost:5173
```

### 3. Running Automated Tests
```powershell
cd backend
npm.cmd test                    # executes 56 unit/integration tests in test-chat.js
```

---

## 🔌 API Reference Overview

### Authentication
- `POST /api/auth/register` — Citizen self-registration (`role` locked to `USER`).
- `POST /api/auth/login` — Sign in with email, password, and `expectedRole`. Returns JWT.
- `GET /api/auth/me` — Returns authenticated profile with role & ward.

### Issues
- `GET /api/issues` — Public feed (strictly filtered to `OPEN`, `ASSIGNED`, `IN_PROGRESS`). *Requires auth.*
- `GET /api/issues/:id` — Single issue detail with status history, assigned engineer, and comments. *Requires auth.*
- `POST /api/issues` — Submit new report (`status` starts as `PENDING_APPROVAL`). *Citizen only.*
- `GET /api/issues/pending` — List pending reports with duplicate warning distance check (<100m, 14d). *Admin only.*
- `GET /api/issues/assigned` — List work orders assigned to current engineer. *Engineer only.*
- `GET /api/issues/mine` — List all issues reported by current user. *User only.*
- `PATCH /api/issues/:id/approve` — Approve pending report (`PENDING_APPROVAL` ➔ `OPEN`). *Admin only.*
- `PATCH /api/issues/:id/reject` — Reject report with required reason (`PENDING_APPROVAL` ➔ `REJECTED`). *Admin only.*
- `PATCH /api/issues/:id/assign` — Assign engineer (`OPEN`/`PENDING_APPROVAL` ➔ `ASSIGNED`). *Admin only.*
- `PATCH /api/issues/:id/status` — Transition status (`ASSIGNED` ➔ `IN_PROGRESS` ➔ `RESOLVED`). *Assigned Engineer/Admin.*
- `POST /api/issues/:id/images` — Upload evidence or resolution photos.
- `POST /api/issues/:id/upvote` — Upvote an issue.
- `POST /api/issues/:id/comments` — Post updates (official badge added for engineers/admins).

### Analytics & AI
- `GET /api/stats/overview` — Role-scoped KPIs (total, open, in-progress, resolved, fix rate, avg days).
- `GET /api/stats/category` — Category distribution.
- `GET /api/stats/status` — Status counts.
- `GET /api/stats/ward` — Ward breakdown.
- `GET /api/stats/trend` — 6-month reporting trend.
- `POST /api/ai/classify` — NLP category, priority, and department classifier.
- `POST /api/ai/chat` — Conversational AI query engine over live database.

---

## 🗺️ Leaflet Map Features
- **Clean Basemap:** High-contrast light tiles so emerald, amber, and blue pins stand out cleanly.
- **Consistent Pin Design:** Color-coded by status, glyph by category, enlarged pin for `CRITICAL` priority.
- **Marker Clustering:** Tuned `maxClusterRadius: 45`, `disableClusteringAtZoom: 16`, and spiderfied pins on max zoom.
- **Duplicate Coordinate Jitter:** Automatically offsets identical GPS coordinates so overlapping markers remain accessible.
- **Admin Toggle:** Optional toggle to display `RESOLVED` issues in a muted grayscale style.
- **Right-Click-To-Report:** Citizens can right-click any coordinate on the map to pre-fill GPS coordinates on `/report`.

---

## 📁 Repository Structure

```
project 140/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma schema with IssueStatusHistory & indexes
│   │   └── dev.db              # SQLite database (in .gitignore)
│   ├── src/
│   │   ├── app.js              # Express app setup, CORS, Helmet, rate limiting
│   │   ├── server.js           # Server entry point (port 5000)
│   │   ├── controllers/        # auth, issue, stats, user, ai, comment, image
│   │   ├── middleware/         # auth (JWT), validate
│   │   ├── routes/             # REST route definitions
│   │   └── services/chat/      # Modular chatbot engine (knowledge, queries, intents)
│   ├── seed.js                 # Database seeder (50 users, 140 issues, history)
│   └── test-chat.js            # Automated chat test suite (56 tests)
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # React Router with ProtectedRoute & RoleRoute
│   │   ├── index.css           # Emerald liquid morphism & CSS variables
│   │   ├── utils.js            # Shared constants, categories, WARDS, STATUS_META
│   │   ├── components/         # Navbar, Footer, ChatWidget, FilterBar, MapPicker...
│   │   ├── context/            # AuthContext (USER, ADMIN, ENGINEER)
│   │   └── pages/              # Home, Login, Register, Issues, IssueDetail,
│   │                           # IssueMap, ReportIssue, Dashboard, AdminPanel,
│   │                           # EngineerPanel, Profile, NotFound
│   └── public/img/             # Compressed and optimized WebP/JPEG assets
├── docs/
│   ├── deployment.md           # Production deployment guide
│   ├── report-draft.md         # Comprehensive project report
│   └── ppt-outline.md          # Presentation slides outline
├── scripts/
│   ├── optimize-images.ps1     # Asset image compressor script
│   └── verify-api.mjs          # Security & role verification script
├── synopsis.md                 # 2-page project synopsis
├── VERSION.txt                 # Release version & changelog
└── README.md                   # This documentation
```