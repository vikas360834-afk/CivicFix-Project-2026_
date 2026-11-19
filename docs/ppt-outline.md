# CivicFix — Presentation Outline (PPT)

Target: ~14 slides / 3-minute demo flow.

1. **Title slide** — CivicFix — Full Stack Civic Issue Reporting & Management (24CIE554), team names/USNs.
2. **Problem** — complaint chaos: lost tickets, no tracking, no prioritised data (2–3 bullets + image).
3. **Solution overview** — one platform: report → AI triage → official action → resolve → analytics.
4. **Existing systems** — CPGRAMS / FixMyStreet / Swachhata; their gaps (status transparency, role workflows, AI, analytics).
5. **Proposed system + features** — role-based users, CRUD, upvotes/comments, status lifecycle, AI chat, dashboard.
6. **Tech stack** — React 18 + Vite + Tailwind 4 + Recharts · Node + Express + Prisma + SQLite · JWT.
7. **System architecture** — 3-tier diagram (frontend / API / DB) + AI service + analytics.
8. **Database design** — User, Issue, Comment, Vote (ER sketch + roles).
9. **AI module** — keyword/NLP classifier (category/priority/department), intent-based chat on live data, optional LLM.
10. **Analytics dashboard** — KPIs, filterable Pie/Bar/Line charts, ward hotspots.
11. **Live demo (3 min)** — citizen reports with AI triage → official resolves → ask chatbot → dashboard filters.
12. **Testing** — E2E API journey + production build.
13. **Deployment** — Vercel frontend, Render backend.
14. **Conclusion & future scope** — maps, SMS alerts, ML predictions.
15. **Thank you / Q&A**

Demo script notes:
- Log in as citizen@civicfix.in / citizen123 → Report an Issue (paste pothole text, show AI banner).
- Switch to official@civicfix.in / official123 → open issue → comment → set IN_PROGRESS → RESOLVED.
- Open the 🤖 chatbot → "How many open issues?" → "Status of issue 3".
- Open Dashboard → apply ward filter → show charts update.