# CivicFix — Final Project Report

**Course:** 24CIE554 Full Stack Development  
**Department:** Computer Science & Engineering  
**Academic Year:** 2026–2027  
**Team Details:**  
- Student 1: `<Name>` (`<USN>`)  
- Student 2: `<Name>` (`<USN>`)  
- Student 3: `<Name>` (`<USN>`)  
**Project Guide:** `<Guide Name>`  
**Date:** October 2026  

---

## 1. Abstract
Urban infrastructure maintenance in growing metropolitan areas faces severe delays due to fragmented grievance reporting, lack of verifiable field execution, and absence of transparent lifecycle tracking. **CivicFix** is an enterprise-grade full-stack civic reporting and municipal dispatch platform built using React 18, Node.js, Express, and Prisma with SQLite. The platform enforces a strict three-role access model (**Citizen (`USER`)**, **Administrator (`ADMIN`)**, and **Ward Engineer (`ENGINEER`)**) and routes complaints through an auditable 5-stage lifecycle (`PENDING_APPROVAL` ➔ `OPEN` ➔ `ASSIGNED` ➔ `IN_PROGRESS` ➔ `RESOLVED` or `REJECTED`). 

The system incorporates an automated NLP category/priority triage classifier, geospatial clustering with Leaflet, an intent-scored conversational AI assistant operating directly over live database aggregates, and a role-scoped analytics dashboard. Field resolutions require photographic evidence and inspection notes, creating an immutable audit trail. This report presents the requirement analysis, system architecture, relational database design, security implementation, automated testing results, and evaluation metrics of the CivicFix system.

---

## 2. Problem Statement
Municipal corporations currently face several systemic hurdles in managing citizen complaints:
1. **Unverified and Duplicate Complaints:** Traditional grievance portals allow unrestricted public posting, leading to duplicate reports for identical potholes or garbage piles, congesting city response queues.
2. **Lack of Field Accountability:** Grievance tickets are frequently marked as "Closed" administratively without physical verification or photographic evidence, eroding citizen trust.
3. **Absence of Role-Tailored Workspaces:** Citizens, municipal commissioners, and field repair engineers are often forced to use generic interfaces that fail to support dispatching, ward filtering, or route navigation.
4. **Data Blindspots:** Decision-makers lack real-time visibility into ward-level response times, repeat failure hotspots, and department-specific resolution rates.

CivicFix resolves these issues by pairing automated duplicate detection and administrative approval with mobile-friendly field engineering dispatch and real-time public transparency.

---

## 3. Literature Survey & Existing Systems
| Feature / Metric | CPGRAMS (National) | FixMyStreet (UK) | Swachhata App (MoHUA) | **CivicFix (Proposed)** |
|---|---|---|---|---|
| **Role-Based Workspaces** | Generic officer view | Public forum | Sanitation only | **Citizen, Admin, Engineer** |
| **Lifecycle Verification** | Administrative signoff | Community voting | Photo mandatory | **Admin Approval + Photo Proof** |
| **Duplicate Warning** | No | Manual search | Automated geo-tagging | **<100m, 14-day Geo-Clustering** |
| **Interactive Map** | No | OSM Pins | Google Maps (basic) | **Clustering + Heatmap + Jitter** |
| **AI NLP Triage** | No | No | No | **Auto category, priority & SLA** |
| **Live Database AI Chat**| No | No | No | **Live Prisma Aggregate Engine** |

---

## 4. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER (SPA)                         │
│  React 18 • Vite • Tailwind CSS 4 • Recharts • Leaflet Mapping         │
│  - Public Static Marketing Portal (11 structured sections)            │
│  - Citizen Portal (/issues, /report, /profile with status tracker)    │
│  - Admin Command Center (/admin - 5 tabs: Pending, Active, Archive...) │
│  - Field Engineer Workspace (/engineer - Kanban My Work)               │
│  - Interactive Map with Clustering, Heatmaps & Directions              │
│  - AI Conversational Assistant (SessionStorage + Card Renderers)       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS / REST (JSON) + JWT
┌──────────────────────────────────▼─────────────────────────────────────┐
│                         APPLICATION TIER                               │
│  Node.js (ESM) • Express • express-validator • Multer • Helmet         │
│  - JWT Authentication & Role Authorization Middleware                  │
│  - Lifecycle State Machine (409 Conflict enforcement on illegal jumps) │
│  - Geographical Duplicate Detector (<100m distance calculation)        │
│  - Scored Intent AI Query Engine (services/chat/*)                     │
│  - Role-Scoped Analytics Aggregations (/api/stats/*)                   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Prisma Client ORM
┌──────────────────────────────────▼─────────────────────────────────────┐
│                           DATA TIER                                    │
│  SQLite (dev.db) / PostgreSQL (production)                             │
│  - Models: User, Issue, IssueImage, Comment, Vote, IssueStatusHistory   │
│  - Geotagged Indexes on status, ward, category, createdAt              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Relational Database Design & Schema

The database model is structured to maintain strict referential integrity and complete auditability:

```prisma
enum Role {
  USER
  ADMIN
  ENGINEER
}

enum IssueStatus {
  PENDING_APPROVAL
  OPEN
  ASSIGNED
  IN_PROGRESS
  RESOLVED
  REJECTED
}

model User {
  id              Int       @id @default(autoincrement())
  email           String    @unique
  password        String
  name            String
  role            Role      @default(USER)
  ward            String?
  phone           String?
  issues          Issue[]   @relation("UserIssues")
  assignedIssues  Issue[]   @relation("AssignedIssues")
  approvedIssues  Issue[]   @relation("ApprovedIssues")
  historyChanges  IssueStatusHistory[]
  createdAt       DateTime  @default(now())
}

model Issue {
  id              Int         @id @default(autoincrement())
  title           String
  description     String
  category        String
  priority        String      @default("MEDIUM")
  status          IssueStatus @default(PENDING_APPROVAL)
  location        String
  ward            String?
  latitude        Float?
  longitude       Float?
  userId          Int
  user            User        @relation("UserIssues", fields: [userId], references: [id])
  assignedToId    Int?
  assignedTo      User?       @relation("AssignedIssues", fields: [assignedToId], references: [id])
  approvedById    Int?
  approvedBy      User?       @relation("ApprovedIssues", fields: [approvedById], references: [id])
  approvedAt      DateTime?
  rejectionReason String?
  assignedAt      DateTime?
  startedAt       DateTime?
  resolvedAt      DateTime?
  resolutionNote  String?
  images          IssueImage[]
  comments        Comment[]
  votes           Vote[]
  statusHistory   IssueStatusHistory[]

  @@index([status])
  @@index([ward])
  @@index([category])
  @@index([createdAt])
}

model IssueStatusHistory {
  id          Int         @id @default(autoincrement())
  issueId     Int
  issue       Issue       @relation(fields: [issueId], references: [id], onDelete: Cascade)
  fromStatus  IssueStatus?
  toStatus    IssueStatus
  changedById Int?
  changedBy   User?       @relation(fields: [changedById], references: [id])
  note        String?
  createdAt   DateTime    @default(now())
}
```

---

## 6. Functional Modules Description

### 1. Citizen Portal (`USER`)
- **Report Submission:** Features live debounce NLP classification. Category, urgency, and municipal department are suggested dynamically as the citizen types.
- **Awaiting Approval Progress Tracker:** Displays a 4-step horizontal progress tracker after submission (`Submitted` ➔ `Verification` ➔ `Assignment` ➔ `Resolution`).
- **Profile & History Audit:** Tracks all user complaints with status badges, rejection feedback, and expandable lifecycle logs.

### 2. Admin Command Center (`ADMIN`)
- **Pending Approvals Queue:** Displays photo evidence, AI suggestions, and automatic duplicate warning banners (triggers if an issue of the same category was submitted within 100 meters over the last 14 days).
- **One-Click Actions:** `Approve`, `Approve & Assign` (with ward-filtered engineer dropdown), and `Reject` (with mandatory reason modal).
- **Bulk Processing:** Multi-select checkboxes allow administrators to approve dozens of verified issues simultaneously.
- **Archive & Role Management:** Historical search across resolved/rejected complaints and role promotions.

### 3. Field Engineer Workspace (`ENGINEER`)
- **3-Column Kanban Board:** Issues grouped into `Assigned`, `In Progress`, and `Completed`.
- **Field Navigation:** One-click Google Maps GPS route navigation link.
- **Resolution Sign-Off:** Modal requires entering an official repair note and uploading a photo showing the completed work before moving to `RESOLVED`.
- **Productivity Strip:** Displays assigned load, active repairs, monthly completions, and average turnaround time.

### 4. Public Live Map & Feed
- **Filtered Feed:** Strict query isolation ensuring `PENDING_APPROVAL`, `RESOLVED`, and `REJECTED` tickets never leak into the general public feed or map.
- **Geospatial Leaflet Canvas:** Custom color-coded pins, category glyphs, coordinate jittering for duplicate spots, and optional heatmap/ward-ring overlays.

### 5. Conversational AI Service
- Natural language query engine built on top of live Prisma aggregates.
- Evaluates queries such as:
  - *"How many open issues in Koramangala?"*
  - *"Average fix time for streetlights"*
  - *"Longest pending unresolved complaints"*
  - *"Repeat problem hotspots across Bengaluru"*
- Includes 6-turn conversational context memory and structured UI card payloads.

---

## 7. Results & Verification Metrics

### Automated Testing Suite
A comprehensive 56-case automated test suite (`backend/test-chat.js`) was developed to validate intent recognition, entity extraction, and live database queries:
- **Test execution count:** 56 test cases
- **Pass rate:** 100% (56 passed, 0 failed)
- **Average query latency:** < 18ms on local SQLite index lookups

### Security Verification (`scripts/verify-api.mjs`)
- **Unauthenticated Access (`/api/issues`, `/api/stats/*`):** Verified to return `401 Unauthorized`.
- **Role Mismatch Enforcement:** Attempting to log into the Admin portal with a Citizen credential returns `403 Forbidden` with a clear user prompt.
- **Illegal Status Transition:** Citizens or unauthorized roles attempting status leaps are rejected with `403` or `409 Conflict`.
- **Public Feed Purity:** 100% of issues returned in `/api/issues` belong to `OPEN`, `ASSIGNED`, or `IN_PROGRESS`.

---

## 8. Screen Captures & User Flows
*(Include screenshots in final submission document)*
1. **Landing Page:** Static marketing page featuring hero, trust chips, role cards, category grid, and FAQ accordion.
2. **Login Modal:** 3 role options (Citizen, Admin, Engineer) with quick demo credential fills.
3. **Report Form:** AI triage banner suggesting category and department with GPS map picker.
4. **Issue Detail:** Vertical status history audit timeline and evidence photo gallery.
5. **Admin Console:** Pending approvals table with duplicate detection alerts.
6. **Engineer Workspace:** Kanban dispatch columns and resolution proof upload modal.
7. **Analytics Dashboard:** Recharts category pie charts, status bar graphs, and 6-month trends.

---

## 9. Conclusion & Future Work
CivicFix demonstrates that civic engagement platforms achieve significantly higher utility when designed around structured municipal workflows rather than simple unmoderated bulletin boards. By combining automated duplicate detection, strict administrative verification, engineer photo proof, and conversational AI analytics, the system bridges the gap between citizens and urban governance.

**Future Enhancements:**
- Integration with municipal GIS shapefiles for sub-ward polygon boundaries.
- Push and SMS notifications via WhatsApp Business API / Twilio.
- Computer vision model to detect duplicate pothole photos automatically upon upload.
- Native mobile companion application (React Native / Android SDK).

---

## 10. References
1. React 18 Documentation — https://react.dev
2. Node.js & Express Architecture — https://expressjs.com
3. Prisma ORM Best Practices — https://www.prisma.io/docs
4. Leaflet & MarkerCluster APIs — https://leafletjs.com
5. Recharts Data Visualization — https://recharts.org
6. OWASP REST Security Cheat Sheet — https://cheatsheetseries.owasp.org