import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Reveal from "../components/Reveal.jsx";
import CountUp from "../components/CountUp.jsx";
import { CATEGORIES, CATEGORY_LABELS } from "../utils.js";
import api from "../api/client.js";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const PALETTE = ["#3B82F6", "#06B6D4", "#8B5CF6", "#10B981", "#F59E0B", "#F43F5E", "#6366F1", "#14B8A6"];

const STEPS = [
  {
    step: "01",
    emoji: "📸",
    title: "Report with Proof",
    text: "Citizens snap photos of potholes, broken lights or garbage. GPS coordinates and ward are captured automatically.",
  },
  {
    step: "02",
    emoji: "🛡️",
    title: "Admin Verifies & Approves",
    text: "Municipal administrators verify complaint legitimacy, confirm AI triage priority, and approve it onto the live public feed.",
  },
  {
    step: "03",
    emoji: "🔧",
    title: "Engineer Assigned & Repairs",
    text: "Assigned ward engineers receive direct work orders with route directions and transition status to In Progress on site.",
  },
  {
    step: "04",
    emoji: "✅",
    title: "Resolved with Proof",
    text: "Engineers upload after-fix photo evidence and write a resolution note. The citizen is notified immediately.",
  },
];

const ROLES = [
  {
    role: "USER",
    title: "Citizen",
    badge: "Public Access",
    icon: "👤",
    description: "Report neighbourhood grievances, upload photo evidence, vote on local priorities, and track resolutions in real time.",
    actionText: "Log in as Citizen →",
    target: "/login?role=USER",
    highlights: ["Photo & GPS uploads", "Upvote community issues", "Personal status tracker"],
  },
  {
    role: "ADMIN",
    title: "Administrator",
    badge: "City Governance",
    icon: "🛡️",
    description: "Verify pending reports, reject duplicate or invalid tickets, dispatch work orders to ward engineers, and view analytics.",
    actionText: "Log in as Admin →",
    target: "/login?role=ADMIN",
    highlights: ["Pending triage queue", "Duplicate detection radar", "Workload dispatching"],
  },
  {
    role: "ENGINEER",
    title: "Ward Engineer",
    badge: "Field Operations",
    icon: "🔧",
    description: "Manage assigned municipal repairs, update field execution status, upload before/after photographic proof, and sign off.",
    actionText: "Log in as Engineer →",
    target: "/login?role=ENGINEER",
    highlights: ["Turn-by-turn directions", "Real-time status updates", "Before/After proof upload"],
  },
];

const FEATURES = [
  { icon: "📸", title: "Photo Evidence", desc: "Attach high-resolution photos with GPS coordinates to substantiate every complaint." },
  { icon: "🗺️", title: "Live Interactive Map", desc: "Clustered map pins, heatmaps, and ward rings showing real-time municipal activity." },
  { icon: "🤖", title: "AI Categorisation & Priority", desc: "NLP model suggests category, severity level, and responsible department in milliseconds." },
  { icon: "🏛️", title: "Department Routing", desc: "Automatic dispatching to PWD, BWSSB, BESCOM, BBMP, or Horticulture teams." },
  { icon: "👍", title: "Upvotes & Citizen Comments", desc: "Crowdsourced urgency scoring enables the most pressing neighbourhood issues to rise to the top." },
  { icon: "📜", title: "Immutable Status Tracking", desc: "Audit log of every state change from submission to approval, assignment, and resolution." },
  { icon: "📊", title: "Analytics Dashboard", desc: "Interactive charts and KPI metrics broken down by category, ward, and response time." },
  { icon: "💬", title: "AI Chat Assistant", desc: "Conversational assistant answering live database questions on counts, hotspots, and FAQs." },
  { icon: "🌗", title: "Light & Dark Mode", desc: "Tailored themes with high-contrast typography, emerald glassmorphism, and WCAG AA compliance." },
  { icon: "📱", title: "Mobile Optimized", desc: "Fully responsive liquid interface engineered for smooth performance on mid-range smartphones." },
];

const FAQS = [
  {
    q: "How does CivicFix differ from traditional complaint portals?",
    a: "Unlike opaque government portals where complaints disappear into black boxes, CivicFix provides an end-to-end transparent lifecycle. Every issue is verified by an Admin, assigned to a named ward engineer, and requires photographic proof before it can be marked resolved.",
  },
  {
    q: "Who approves newly reported issues?",
    a: "City administrators review incoming tickets in the Pending Triage queue. They verify photo evidence, ensure issues aren't duplicates within 100 meters, and approve them onto the public feed and map.",
  },
  {
    q: "Can anyone register as an Administrator or Engineer?",
    a: "No. Public self-registration creates verified Citizen (USER) accounts only. Administrative and Engineer accounts are provisioned exclusively through municipal administrators to maintain system integrity.",
  },
  {
    q: "What categories of issues can I report?",
    a: "You can report 8 canonical categories: Road & Pavement, Street Lights, Water Supply & Drainage, Sanitation & Garbage, Electricity, Parks & Gardens, Gas/Pipeline, and Other general civic hazards.",
  },
  {
    q: "How does the AI triage work?",
    a: "As you type your complaint description, our client-side and server-side NLP engine scores keywords to suggest the most accurate category, estimates urgency (Critical, High, Medium, Low), and routes to the correct department.",
  },
  {
    q: "What happens if someone reports the same issue twice?",
    a: "Our duplicate detection algorithm automatically flags incoming reports within ~100 meters of an existing complaint filed within the last 14 days, alerting the administrator before approval.",
  },
  {
    q: "Can I track the status of my report without logging in?",
    a: "You can view general public issues and map pins when logged in. For privacy and data protection, guest visitors see platform information, while registered citizens track their personal tickets in their profile.",
  },
  {
    q: "Is my personal phone number or email public?",
    a: "No. Only your display name, issue title, and ward location appear on public records. Your personal contact information is protected and never displayed to other users.",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    inProgress: 0,
    pending: 0,
    categories: [],
    trend: [],
  });

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const mo = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    Promise.all([
      api.get("/stats/overview").catch(() => ({ data: {} })),
      api.get("/stats/category").catch(() => ({ data: { categories: [] } })),
      api.get("/stats/trend").catch(() => ({ data: { trend: [] } })),
    ]).then(([ov, cat, tr]) => {
      const cats = (cat.data.categories || []).map((c) => ({
        ...c,
        category: CATEGORY_LABELS[c.category] || c.category,
      }));
      const trends = (tr.data.trend || []).map((t) => ({ ...t, label: t.label || t.month || t.period }));
      const total = ov.data.total ?? 0;
      const resCount = (ov.data.resolved ?? ov.data.byStatus?.RESOLVED ?? 0) + (ov.data.closed ?? ov.data.byStatus?.CLOSED ?? 0);
      const inProgCount = (ov.data.inProgress ?? ov.data.byStatus?.IN_PROGRESS ?? 0) + (ov.data.assigned ?? ov.data.byStatus?.ASSIGNED ?? 0);
      const pendCount = ov.data.pending ?? ov.data.byStatus?.PENDING_APPROVAL ?? 0;

      setStats({
        total,
        resolved: resCount,
        inProgress: inProgCount,
        pending: pendCount,
        categories: cats,
        trend: trends,
      });
    });
  }, []);

  const axisTick = useMemo(() => ({ fill: isDark ? "#94A3B8" : "#64748B", fontSize: 11 }), [isDark]);
  const tooltipProps = useMemo(
    () => ({
      contentStyle: {
        background: isDark ? "#10182A" : "#FFFFFF",
        border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid #E2E8F0",
        borderRadius: 14,
        fontSize: 12,
        color: isDark ? "#F8FAFC" : "#0F172A",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
      },
    }),
    [isDark]
  );
  const legendProps = useMemo(() => ({ wrapperStyle: { fontSize: 11, paddingTop: 8 } }), []);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div id="home" className="relative isolate overflow-hidden">
      {/* Morphing Liquid Background Blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="liquid-blob liquid-blob-emerald -top-24 -left-20 h-96 w-96" />
        <div className="liquid-blob liquid-blob-teal top-1/3 -right-24 h-[450px] w-[450px]" style={{ animationDelay: "-6s" }} />
        <div className="liquid-blob liquid-blob-lime bottom-1/4 left-1/4 h-80 w-80" style={{ animationDelay: "-12s" }} />
      </div>

      {/* 1. HERO SECTION */}
      <section className="relative isolate overflow-hidden px-4 pb-16 pt-14 sm:pb-20 sm:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                </span>
                <span>Next-Gen Civic Redressal & Live Analytics Engine</span>
              </div>

              {/* Single h1 for SEO */}
              <h1 className="anime-pop mt-6 text-4xl font-black tracking-tight text-slate-900 sm:text-6xl dark:text-slate-50">
                Report it. Track it.{" "}
                <span className="text-gradient-animated block sm:inline">Get it fixed.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base text-slate-600 sm:text-lg dark:text-slate-300">
                CivicFix connects citizens directly with city administrators and ward engineers.
                From pothole repairs to sewage overflows, track every milestone with photo evidence,
                AI-driven department routing, and full public accountability.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/report"
                  className="btn-shine hover-pop rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 px-6 py-3.5 text-base font-bold text-white shadow-xl shadow-blue-500/25"
                >
                  Report an Issue →
                </Link>
                <Link
                  to="/analytics"
                  className="hover-pop rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-6 py-3.5 text-base font-bold text-cyan-300 backdrop-blur-md hover:bg-cyan-500/20"
                >
                  📊 View Live Graphs
                </Link>
                <Link
                  to="/login"
                  className="hover-pop rounded-xl border border-white/10 bg-slate-900/60 px-6 py-3.5 text-base font-bold text-slate-200 backdrop-blur-md hover:bg-slate-800"
                >
                  Sign In to Portal
                </Link>
              </div>

              {/* Trust Chips */}
              <div className="mt-10 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span className="rounded-lg border border-slate-200/80 bg-white/60 px-3 py-1.5 backdrop-blur dark:border-slate-800 dark:bg-slate-800/50">
                  🛡️ 100% Verified Admins
                </span>
                <span className="rounded-lg border border-slate-200/80 bg-white/60 px-3 py-1.5 backdrop-blur dark:border-slate-800 dark:bg-slate-800/50">
                  ⚡ 4-Stage Status Audit
                </span>
                <span className="rounded-lg border border-slate-200/80 bg-white/60 px-3 py-1.5 backdrop-blur dark:border-slate-800 dark:bg-slate-800/50">
                  🤖 Automated AI Triage
                </span>
                <span className="rounded-lg border border-slate-200/80 bg-white/60 px-3 py-1.5 backdrop-blur dark:border-slate-800 dark:bg-slate-800/50">
                  📍 Ward GPS Coordinates
                </span>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5">
              <div className="glass-card specular-edge relative overflow-hidden p-3 shadow-2xl">
                <img
                  src="/img/hero.jpg"
                  alt="City engineers and municipal workers repairing an urban street"
                  loading="eager"
                  className="h-72 w-full rounded-xl object-cover sm:h-96"
                />
                <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-white/30 bg-slate-900/80 p-4 text-white backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-emerald-400 font-bold">Field Redressal</p>
                      <p className="text-sm font-bold">Koramangala 5th Block Road Fix</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-extrabold text-emerald-300 ring-1 ring-emerald-400/40">
                      RESOLVED ✅
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE INTERACTIVE ANALYTICS & GRAPHS SHOWCASE */}
      <section id="live-analytics" className="relative border-y border-white/10 bg-[#10182A]/70 py-16 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                Live Civic Database Intelligence
              </div>
              <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                Municipal Analytics & <span className="grad-text">Resolution Graphs</span>
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Live interactive charts reflecting actual database records across all 12 wards and 8 categories.
              </p>
            </div>
          </Reveal>

          {/* 4 Live KPI Counters */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal delay={100} className="h-full">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Grievances</span>
                  <span className="text-xl">📊</span>
                </div>
                <p className="mt-2 text-3xl font-black text-white">{stats.total}</p>
                <p className="mt-1 text-[11px] text-cyan-400 font-medium">Logged across 12 municipal wards</p>
              </div>
            </Reveal>

            <Reveal delay={150} className="h-full">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Resolved & Closed</span>
                  <span className="text-xl">✅</span>
                </div>
                <p className="mt-2 text-3xl font-black text-emerald-400">{stats.resolved}</p>
                <p className="mt-1 text-[11px] text-emerald-400/80 font-medium">Verified by citizen sign-off</p>
              </div>
            </Reveal>

            <Reveal delay={200} className="h-full">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Under Active Repair</span>
                  <span className="text-xl">🔧</span>
                </div>
                <p className="mt-2 text-3xl font-black text-blue-400">{stats.inProgress}</p>
                <p className="mt-1 text-[11px] text-blue-400/80 font-medium">Assigned to ward engineers</p>
              </div>
            </Reveal>

            <Reveal delay={250} className="h-full">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Triage</span>
                  <span className="text-xl">⏳</span>
                </div>
                <p className="mt-2 text-3xl font-black text-amber-400">{stats.pending}</p>
                <p className="mt-1 text-[11px] text-amber-400/80 font-medium">In administrative verification</p>
              </div>
            </Reveal>
          </div>

          {/* 2 Primary Featured Interactive Recharts */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Chart 1: Category Distribution */}
            <Reveal delay={300} className="h-full">
              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur shadow-2xl">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-white text-base">Issue Category Distribution</h3>
                  <span className="rounded-lg bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">Pie Chart</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">Live distribution across PWD, BWSSB, BESCOM & sanitation</p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categories}
                        dataKey="count"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        label={(e) => `${e.count}`}
                      >
                        {stats.categories.map((e, idx) => (
                          <Cell key={e.category} fill={PALETTE[idx % PALETTE.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipProps} />
                      <Legend {...legendProps} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Reveal>

            {/* Chart 2: Resolution Trends */}
            <Reveal delay={350} className="h-full">
              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur shadow-2xl">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-white text-base">Issue Resolution Trends</h3>
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">Line Chart</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">Trajectory comparing reported complaints vs verified resolutions</p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="label" tick={axisTick} />
                      <YAxis allowDecimals={false} tick={axisTick} />
                      <Tooltip {...tooltipProps} />
                      <Legend {...legendProps} />
                      <Line type="monotone" dataKey="count" name="Reported" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Banner to Full Analytics Center */}
          <div className="mt-8 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-purple-950/40 p-5 text-center backdrop-blur shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <p className="font-bold text-white text-sm">Want to inspect weekly inflows and department SLAs?</p>
                <p className="text-xs text-slate-400 mt-0.5">Explore 14-day area charts, horizontal department rankings, and ward filters.</p>
              </div>
              <Link
                to="/analytics"
                className="shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:opacity-95"
              >
                Open Full Analytics Suite →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ABOUT CIVICFIX SECTION */}
      <section id="about" className="relative border-y border-slate-200/80 bg-white/50 py-16 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Our Mission & Purpose
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-slate-50">
                Empowering Citizens. Enabling Municipal Action.
              </h2>
              <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
                Cities grow rapidly, but traditional grievance lines lead to lost tickets, repeated complaints, and zero visibility.
                CivicFix was engineered to turn frustration into structured municipal action.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Reveal delay={100} className="h-full">
              <div className="glass-card h-full p-6">
                <span className="text-3xl">🕳️</span>
                <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">The Problem</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Residents notice broken civic infrastructure daily, but complaints made on social media or paper registers get ignored without accountability.
                </p>
              </div>
            </Reveal>

            <Reveal delay={200} className="h-full">
              <div className="glass-card h-full p-6">
                <span className="text-3xl">🎯</span>
                <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">Our Solution</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  A transparent 3-party platform where citizens file geotagged evidence, administrators triage and assign tasks, and ward engineers sign off with proof.
                </p>
              </div>
            </Reveal>

            <Reveal delay={300} className="h-full">
              <div className="glass-card h-full p-6">
                <span className="text-3xl">🤝</span>
                <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">Collective Impact</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Every resolved issue closes the feedback loop, creating clean streets, functioning street lights, and safer neighbourhoods for everyone.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS (4 STEPS) */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Simple & Transparent
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-slate-50">
                How CivicFix Works in 4 Steps
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                From initial citizen report to on-site municipal sign-off.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.step} delay={i * 120} className="h-full">
                <div className="glass-card group relative h-full overflow-hidden p-6 hover:-translate-y-1">
                  <span className="absolute right-4 top-4 text-4xl font-black text-slate-200/80 transition group-hover:text-emerald-300 dark:text-slate-800 dark:group-hover:text-emerald-800">
                    {s.step}
                  </span>
                  <span className="text-3xl">{s.emoji}</span>
                  <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">{s.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. THREE ROLES CARDS */}
      <section id="roles" className="border-t border-slate-200/80 bg-slate-50/60 py-20 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Role-Based Workflows
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-slate-50">
                Tailored Portals for Every Stakeholder
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Choose your login method to enter the specialized interface.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {ROLES.map((r, i) => (
              <Reveal key={r.role} delay={i * 150} className="h-full">
                <div className="glass-card relative flex h-full flex-col justify-between p-7 hover:-translate-y-1.5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-4xl">{r.icon}</span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {r.badge}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-50">{r.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{r.description}</p>
                    <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                      {r.highlights.map((h) => (
                        <li key={h} className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => navigate(r.target)}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 py-3 text-center text-sm font-bold text-white shadow-md transition hover:from-emerald-700 hover:to-teal-600"
                    >
                      {r.actionText}
                    </button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FEATURES GRID (10 CARDS) */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Full-Stack Capabilities
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-slate-50">
                Built with Modern City Standards
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Everything required for high-velocity municipal issue resolution.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 70} className="h-full">
                <div className="glass-card h-full p-5 hover:-translate-y-1">
                  <span className="text-2xl">{f.icon}</span>
                  <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">{f.title}</h3>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6. EIGHT ISSUE CATEGORIES WITH PHOTOS */}
      <section id="categories" className="border-t border-slate-200/80 bg-slate-50/50 py-20 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Citywide Grievance Coverage
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-slate-50">
                8 Issue Categories Managed Daily
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Real-world municipal departments mapped directly to civic concerns.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((c, i) => {
              const imgMap = {
                ROAD: "/img/pothole.jpg",
                STREET_LIGHT: "/img/streetlight.jpg",
                WATER: "/img/water.jpg",
                SANITATION: "/img/garbage.jpg",
                ELECTRICITY: "/img/electricity.jpg",
                PARK: "/img/park.jpg",
                GAS: "/img/gas.jpg",
                OTHER: "/img/city-street.jpg",
              };
              return (
                <Reveal key={c.key} delay={i * 80} className="h-full">
                  <div className="glass-card group overflow-hidden rounded-2xl">
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={imgMap[c.key]}
                        alt={c.label}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                        {c.emoji} {c.label}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{c.label}</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Assigned to specialized ward engineers and municipal maintenance crews.
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. AI ASSISTANT SPOTLIGHT */}
      <section id="ai-spotlight" className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <Reveal>
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-800 dark:text-teal-300">
                  <span>🤖</span>
                  <span>Grounded in Real-Time Database</span>
                </div>
                <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-slate-50">
                  Intelligent Civic AI Assistant
                </h2>
                <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
                  Ask open questions and get accurate numbers computed directly from live database records.
                  The assistant understands typos, multi-intent queries, and conversational follow-ups.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3.5 backdrop-blur dark:border-slate-800 dark:bg-slate-800/50">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">💬 "How many issues are open in Koramangala?"</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      Returns live counts of open, assigned, in-progress, and resolved complaints in seconds.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3.5 backdrop-blur dark:border-slate-800 dark:bg-slate-800/50">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">💬 "Compare Indiranagar and Whitefield"</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      Performs real-time aggregations comparing complaint volume and top defect categories across wards.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3.5 backdrop-blur dark:border-slate-800 dark:bg-slate-800/50">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">💬 "What is the average fix time?"</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      Computes true resolution duration across all signed-off work orders and highlights the fastest categories.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-6">
              <div className="glass-card specular-edge relative p-6 shadow-2xl">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl text-white shadow">
                    🤖
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">CivicFix Assistant</h3>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">● Online · Connected to Database</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-600 p-3 text-xs text-white">
                    How many issues are being solved right now across the city?
                  </div>
                  <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-200/80 bg-white/90 p-3 text-xs text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-800/90 dark:text-slate-200">
                    Currently, there are active work orders dispatched on site with engineers. Here is the city-wide status breakdown:
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <span className="rounded-lg bg-blue-50 p-1.5 font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">🔵 In Progress: 29</span>
                      <span className="rounded-lg bg-emerald-50 p-1.5 font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">✅ Solved: 37</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TRANSPARENCY SECTION (WORKFLOW & PROOF) */}
      <section id="transparency" className="border-t border-slate-200/80 bg-slate-50/60 py-20 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                End-to-End Auditability
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-slate-50">
                Radical Transparency at Every Step
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                No secret delays. Every ticket features an immutable timeline and proof verification.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* Timeline Graphic */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Live Status Milestones</h3>
              <div className="mt-6 space-y-4 border-l-2 border-emerald-500/40 pl-4">
                <div className="relative">
                  <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-purple-500 ring-4 ring-white dark:ring-slate-900" />
                  <p className="text-xs font-bold text-purple-700 dark:text-purple-400">1. PENDING APPROVAL</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Citizen submitted complaint with photo evidence & GPS coordinates.</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-amber-500 ring-4 ring-white dark:ring-slate-900" />
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">2. APPROVED (OPEN)</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Admin verified authenticity, approved onto public feed and map.</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400">3. IN PROGRESS</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Assigned Ward Engineer arrived on site with crew & equipment.</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900" />
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">4. RESOLVED & VERIFIED</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Resolution note recorded, after-fix photo uploaded, citizen notified.</p>
                </div>
              </div>
            </div>

            {/* Before / After Proof */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Before & After Photographic Proof</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Required before marking any ticket resolved.</p>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <div className="relative h-40 overflow-hidden rounded-xl">
                    <img src="/img/pothole.jpg" alt="Reported pothole defect before repair" className="h-full w-full object-cover" />
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                      BEFORE
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Deep crater on main road dangerous to 2-wheelers.</p>
                </div>
                <div>
                  <div className="relative h-40 overflow-hidden rounded-xl">
                    <img src="/img/resolved.jpg" alt="Repaired and asphalted road after work" className="h-full w-full object-cover" />
                    <span className="absolute bottom-2 left-2 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      AFTER
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Asphalt relaying completed and inspected by engineer.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. ANIMATED IMPACT NUMBERS (DEMO FIGURES) */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Civic Velocity (Demonstration Figures)
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-slate-50">
                Proven Scale for Modern Governance
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                *The numbers below represent simulated city benchmarks for demo purposes.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Issues Resolved", val: 14280, prefix: "", suffix: "+", sub: "Verified with after-photos" },
              { label: "Resolution Rate", val: 94.8, prefix: "", suffix: "%", sub: "City-wide turnaround" },
              { label: "Average Fix Time", val: 48, prefix: "", suffix: " hrs", sub: "Emergency to routine SLA" },
              { label: "Active Municipal Wards", val: 50, prefix: "", suffix: "+", sub: "Bengaluru coverage" },
            ].map((kpi, idx) => (
              <Reveal key={kpi.label} delay={idx * 100} className="h-full">
                <div className="glass-card h-full p-6 text-center hover:-translate-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">{kpi.label}</p>
                  <p className="mt-2 text-4xl font-black text-emerald-600 dark:text-emerald-400">
                    <CountUp value={kpi.val} />
                    {kpi.suffix}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{kpi.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FAQ ACCORDION */}
      <section id="faq" className="border-t border-slate-200/80 bg-slate-50/50 py-20 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-4xl px-4">
          <Reveal>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Frequently Asked Questions
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-slate-50">
                Got Questions? We Have Answers.
              </h2>
            </div>
          </Reveal>

          <div className="mt-10 space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="glass-card overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-slate-900 dark:text-slate-100"
                  >
                    <span>{faq.q}</span>
                    <span className="text-lg text-emerald-600 dark:text-emerald-400 font-black">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 11. FINAL CALL TO ACTION */}
      <section className="relative isolate overflow-hidden bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 py-20 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <Reveal>
            <h2 className="text-3xl font-black sm:text-5xl">
              Ready to improve your neighbourhood?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-emerald-100">
              Join thousands of proactive citizens and city engineers making our urban landscape safer and cleaner every day.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="btn-shine hover-pop rounded-xl bg-white px-8 py-4 text-base font-bold text-emerald-800 shadow-2xl hover:bg-emerald-50"
              >
                Create Citizen Account →
              </Link>
              <Link
                to="/login"
                className="hover-pop rounded-xl border border-white/40 px-8 py-4 text-base font-bold text-white backdrop-blur hover:bg-white/10"
              >
                Sign In
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}