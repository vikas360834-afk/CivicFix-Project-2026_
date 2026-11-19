import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import StatCard from "../components/StatCard.jsx";
import FilterBar from "../components/FilterBar.jsx";
import { StatusBadge, PriorityBadge } from "../components/Badges.jsx";
import Confetti from "../components/Confetti.jsx";
import {
  CATEGORY_LABELS,
  CATEGORY_EMOJI,
  STATUS_META,
  fmtDate,
  timeAgo,
  apiError,
  issuePhoto,
} from "../utils.js";
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const PALETTE = ["#3B82F6", "#06B6D4", "#8B5CF6", "#10B981", "#F59E0B", "#F43F5E", "#6366F1", "#14B8A6"];

const DEPT_TO_CAT = {
  PWD: "ROAD",
  Lighting: "STREET_LIGHT",
  BWSSB: "WATER",
  Sanitation: "SANITATION",
  BESCOM: "ELECTRICITY",
  Parks: "PARK",
  Gas: "GAS",
  Admin: "OTHER",
};

const emptyFilters = { category: "", status: "", ward: "", from: "", to: "" };

const TIMELINE_STEPS = [
  { key: "PENDING_APPROVAL", label: "Reported", icon: "📝" },
  { key: "OPEN", label: "Approved", icon: "✅" },
  { key: "ASSIGNED", label: "Assigned", icon: "📋" },
  { key: "IN_PROGRESS", label: "In Progress", icon: "🔧" },
  { key: "RESOLVED", label: "Resolved", icon: "🎉" },
  { key: "CLOSED", label: "Verified", icon: "⭐" },
];

function getTimelineIndex(status) {
  if (status === "REJECTED") return -1;
  const map = {
    PENDING_APPROVAL: 0,
    OPEN: 1,
    ASSIGNED: 2,
    IN_PROGRESS: 3,
    RESOLVED: 4,
    CLOSED: 5,
  };
  return map[status] ?? 0;
}

export default function Dashboard() {
  const { user, isAdmin, isEngineer } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "my-reports";

  // Active dashboard tab
  const [activeTab, setActiveTab] = useState(initialTab); // "my-reports" | "nearby" | "activity" | "analytics" | "leaderboard"

  // Data states
  const [filters, setFilters] = useState(emptyFilters);
  const [overview, setOverview] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [wardData, setWardData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [myIssues, setMyIssues] = useState([]);
  const [nearbyIssues, setNearbyIssues] = useState([]);
  const [communityActivity, setCommunityActivity] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userStats, setUserStats] = useState(null);

  // Interaction states
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [mySearch, setMySearch] = useState("");
  const [myStatusFilter, setMyStatusFilter] = useState("ALL");
  const [verifyModal, setVerifyModal] = useState({ open: false, issue: null, feedback: "" });
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Dark mode tracking for chart themes
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const mo = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const axisTick = useMemo(() => ({ fill: isDark ? "#94A3B8" : "#64748B", fontSize: 11 }), [isDark]);
  const tooltipProps = useMemo(
    () => ({
      contentStyle: {
        background: isDark ? "#10182A" : "#FFFFFF",
        border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid #E2E8F0",
        borderRadius: 14,
        fontSize: 12,
        color: isDark ? "#F8FAFC" : "#0F172A",
        boxShadow: "0 20px 40px -12px rgba(0,0,0,0.6)",
        backdropFilter: "blur(12px)",
      },
      labelStyle: { color: isDark ? "#94A3B8" : "#475569", fontWeight: 700 },
      cursor: { fill: isDark ? "rgba(59,130,246,0.08)" : "rgba(15,23,42,0.04)" },
    }),
    [isDark]
  );
  const legendProps = useMemo(
    () => ({
      wrapperStyle: { fontSize: 12, paddingTop: 8 },
      formatter: (value) => <span style={{ color: isDark ? "#94A3B8" : "#475569" }}>{value}</span>,
    }),
    [isDark]
  );

  // Fetch all core data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError("");

    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "")).toString();
    const suffix = q ? `?${q}` : "";

    try {
      const [o, c, s, w, t, wk, d, lead, mineRes, publicRes] = await Promise.all([
        api.get(`/stats/overview${suffix}`).catch(() => ({ data: null })),
        api.get(`/stats/category${suffix}`).catch(() => ({ data: { categories: [] } })),
        api.get(`/stats/status${suffix}`).catch(() => ({ data: { statuses: [] } })),
        api.get(`/stats/ward${suffix}`).catch(() => ({ data: { wards: [] } })),
        api.get(`/stats/trend${suffix}`).catch(() => ({ data: { trend: [] } })),
        api.get(`/stats/weekly${suffix}`).catch(() => ({ data: { weekly: [] } })),
        api.get(`/stats/departments${suffix}`).catch(() => ({ data: { departments: [] } })),
        api.get("/stats/leaderboard").catch(() => ({ data: { leaderboard: [], userStats: null } })),
        api.get("/issues/mine").catch(() => ({ data: { issues: [] } })),
        api.get("/issues?limit=30").catch(() => ({ data: { issues: [] } })),
      ]);

      setOverview(o.data);
      setCategoryData(c.data.categories || []);
      setStatusData(s.data.statuses || []);
      setWardData(w.data.wards || []);
      setTrendData(t.data.trend || []);
      setWeeklyData(wk.data.weekly || []);
      setDepartmentData(d.data.departments || []);
      setLeaderboardData(lead.data.leaderboard || []);
      setUserStats(lead.data.userStats);

      const myIssuesList = mineRes.data.issues || [];
      setMyIssues(myIssuesList);

      const publicList = publicRes.data.issues || [];
      if (user?.ward) {
        setNearbyIssues(publicList.filter((i) => i.ward === user.ward));
      } else {
        setNearbyIssues(publicList.slice(0, 8));
      }
      setCommunityActivity(publicList.slice(0, 10));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Verify Resolution
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyModal.issue) return;
    setBusy(true);
    try {
      await api.patch(`/issues/${verifyModal.issue.id}/verify`, {
        feedback: verifyModal.feedback,
      });
      showToast("Issue resolution verified! Contribution points updated ✨");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      setVerifyModal({ open: false, issue: null, feedback: "" });
      await loadDashboardData();
    } catch (err) {
      showToast(apiError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  // Upvote an issue directly from dashboard
  const handleUpvote = async (issueId) => {
    try {
      const { data } = await api.post(`/issues/${issueId}/upvote`);
      setNearbyIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, upvotes: data.upvotes } : i))
      );
      showToast(data.upvoted ? "Upvoted! Priority boosted." : "Upvote removed");
    } catch (err) {
      showToast(apiError(err), "error");
    }
  };

  // Filter citizen's reports
  const filteredMyIssues = useMemo(() => {
    return myIssues.filter((i) => {
      const matchSearch =
        !mySearch ||
        i.title.toLowerCase().includes(mySearch.toLowerCase()) ||
        i.location.toLowerCase().includes(mySearch.toLowerCase()) ||
        String(i.id).includes(mySearch);
      const matchStatus = myStatusFilter === "ALL" || i.status === myStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [myIssues, mySearch, myStatusFilter]);

  return (
    <div className="relative isolate min-h-screen">
      {showConfetti && <Confetti />}

      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-2xl transition-all duration-300 animate-slide-up ${
            toast.type === "error"
              ? "bg-rose-950/90 text-rose-200 border border-rose-500/40 shadow-rose-950/50"
              : "bg-blue-950/90 text-blue-100 border border-blue-500/40 shadow-blue-950/50"
          }`}
        >
          <span className="text-base">{toast.type === "error" ? "⚠️" : "✅"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Civic background accent lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute top-80 right-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-40 left-10 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ========================================================
            1. MODERN WELCOME SECTION & CITIZEN CONTRIBUTION STRIP
            ======================================================== */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-[#10182A]/95 to-[#080D1A]/90 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: User Welcome */}
            <div className="flex items-start gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-2xl font-black text-white shadow-lg shadow-blue-500/30">
                {user?.name?.charAt(0)?.toUpperCase() || "C"}
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white ring-2 ring-[#080D1A]">
                  ✓
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black text-white sm:text-3xl">
                    Welcome back, <span className="grad-text">{user?.name || "Citizen"}</span>
                  </h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-bold text-blue-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                    Live Sync
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-400 sm:text-sm">
                  {user?.ward ? `Assigned to ${user.ward}` : "Bengaluru Metropolitan Civic Network"} · Citizen Grievance Portal
                </p>

                {/* Gamification Points & Badges preview */}
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setBadgeModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300 transition-all hover:bg-amber-500/20 cursor-pointer"
                  >
                    <span>⭐</span>
                    <span>{userStats?.points || 0} Civic Points</span>
                    <span className="text-amber-400/60">·</span>
                    <span className="underline">Rank #{userStats?.rank || "-"}</span>
                  </button>
                  <button
                    onClick={() => setBadgeModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300 transition-all hover:bg-violet-500/20 cursor-pointer"
                  >
                    <span>🎖️</span>
                    <span>{userStats?.badges?.length || 0} Badges Earned</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/report"
                className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <span className="text-base font-extrabold">+</span>
                <span>Report New Issue</span>
              </Link>
              <Link
                to="/map"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition-all hover:bg-white/10 hover:border-white/20 backdrop-blur-xl"
              >
                <span>🗺️</span>
                <span>Live Map</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 hover:bg-violet-500/20"
                >
                  <span>🛡️</span>
                  <span>Admin Command</span>
                </Link>
              )}
              {isEngineer && (
                <Link
                  to="/engineer"
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20"
                >
                  <span>🔧</span>
                  <span>Field Tasks</span>
                </Link>
              )}
            </div>
          </div>

          {/* Quick Metrics KPI Strip */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">My Reports</p>
              <p className="mt-1 text-2xl font-black text-white">{myIssues.length}</p>
              <p className="mt-0.5 text-[10px] text-blue-400">Total submitted</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">In Progress</p>
              <p className="mt-1 text-2xl font-black text-cyan-400">
                {myIssues.filter((i) => i.status === "IN_PROGRESS" || i.status === "ASSIGNED").length}
              </p>
              <p className="mt-0.5 text-[10px] text-cyan-300">Under repair</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">Resolved</p>
              <p className="mt-1 text-2xl font-black text-emerald-400">
                {myIssues.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length}
              </p>
              <p className="mt-0.5 text-[10px] text-emerald-300">Fix completed</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">City Open</p>
              <p className="mt-1 text-2xl font-black text-amber-400">{overview?.open ?? 0}</p>
              <p className="mt-0.5 text-[10px] text-amber-300">Awaiting fix</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">City Resolved</p>
              <p className="mt-1 text-2xl font-black text-blue-400">{overview?.resolved ?? 0}</p>
              <p className="mt-0.5 text-[10px] text-blue-300">{overview?.resolvedRate ?? 0}% success rate</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">Avg Fix Time</p>
              <p className="mt-1 text-2xl font-black text-violet-400">{overview?.avgResolutionDays ?? 0}d</p>
              <p className="mt-0.5 text-[10px] text-violet-300">From submission</p>
            </div>
          </div>
        </div>

        {/* ========================================================
            2. DASHBOARD NAVIGATION TABS
            ======================================================== */}
        <div className="mt-8 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "my-reports", label: "My Reports", icon: "📋", count: myIssues.length },
              { id: "nearby", label: "Nearby Issues", icon: "📍", count: nearbyIssues.length },
              { id: "activity", label: "Community Feed", icon: "⚡" },
              { id: "analytics", label: "Interactive Analytics", icon: "📊" },
              { id: "leaderboard", label: "Leaderboard & Badges", icon: "🏆" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      activeTab === tab.id ? "bg-white/25 text-white" : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================
            TAB 1: MY REPORTS & ISSUE PROGRESSION TIMELINE
            ======================================================== */}
        {activeTab === "my-reports" && (
          <div className="mt-6 space-y-6">
            {/* Search and Status Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="relative flex-1 sm:max-w-xs">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search my reports…"
                  value={mySearch}
                  onChange={(e) => setMySearch(e.target.value)}
                  className="input pl-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {["ALL", "PENDING_APPROVAL", "OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"].map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => setMyStatusFilter(st)}
                      className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                        myStatusFilter === st
                          ? "bg-blue-600 text-white shadow-xs"
                          : "border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {st === "ALL" ? "All Statuses" : STATUS_META[st]?.label || st}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* List of Citizen's Reports */}
            {filteredMyIssues.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
                <span className="text-4xl">🌱</span>
                <h3 className="mt-3 text-lg font-bold text-white">No complaints found</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {mySearch || myStatusFilter !== "ALL"
                    ? "Try adjusting your search or status filter."
                    : "You haven't filed any complaints yet. Report an issue in your neighborhood to start tracking!"}
                </p>
                <Link to="/report" className="btn btn-primary mt-4 inline-flex">
                  + File First Complaint
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredMyIssues.map((iss) => {
                  const stepIdx = getTimelineIndex(iss.status);
                  const isResolved = iss.status === "RESOLVED";
                  const isVerified = iss.status === "CLOSED";

                  return (
                    <div
                      key={iss.id}
                      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#10182A]/90 to-[#080D1A]/95 p-5 backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/10"
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-base border border-blue-500/20">
                            {CATEGORY_EMOJI[iss.category] || "📍"}
                          </span>
                          <div>
                            <span className="text-[11px] font-bold text-blue-400">#{iss.id}</span>
                            <span className="ml-2 text-xs text-slate-400">
                              {CATEGORY_LABELS[iss.category] || iss.category}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={iss.status} />
                      </div>

                      {/* Title & Description */}
                      <Link to={`/issues/${iss.id}`} className="mt-3 block">
                        <h4 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors line-clamp-1">
                          {iss.title}
                        </h4>
                        <p className="mt-1 text-xs text-slate-400 line-clamp-2">{iss.description}</p>
                      </Link>

                      {/* Location & Time */}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <span>📍</span> {iss.location}
                        </span>
                        {iss.ward && (
                          <span className="flex items-center gap-1">
                            <span>🏛️</span> {iss.ward}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span>🕒</span> {timeAgo(iss.createdAt)}
                        </span>
                      </div>

                      {/* 7-Stage Status Progression Timeline */}
                      <div className="mt-5 border-t border-white/10 pt-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                          Resolution Progression
                        </p>
                        <div className="relative flex items-center justify-between">
                          <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-white/10 -z-0" />
                          <div
                            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500 -z-0"
                            style={{ width: `${Math.max(0, Math.min(100, (stepIdx / 5) * 100))}%` }}
                          />

                          {TIMELINE_STEPS.map((step, idx) => {
                            const isDone = stepIdx >= idx;
                            const isCurrent = stepIdx === idx;

                            return (
                              <div key={step.key} className="relative z-10 flex flex-col items-center">
                                <div
                                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 ring-4 ring-[#10182A] ${
                                    isCurrent
                                      ? "bg-cyan-400 text-slate-900 shadow-lg shadow-cyan-400/50 scale-110"
                                      : isDone
                                      ? "bg-blue-600 text-white"
                                      : "bg-slate-800 text-slate-500"
                                  }`}
                                  title={step.label}
                                >
                                  {isDone ? "✓" : idx + 1}
                                </div>
                                <span
                                  className={`mt-1 text-[9px] font-bold ${
                                    isCurrent ? "text-cyan-400" : isDone ? "text-slate-300" : "text-slate-600"
                                  }`}
                                >
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Verification CTA if Resolved */}
                      {isResolved && (
                        <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                          <div className="text-xs">
                            <p className="font-bold text-emerald-300">Action Required: Verify Resolution</p>
                            <p className="text-[11px] text-emerald-400/80">
                              The municipal engineer completed work. Please verify if the issue is solved.
                            </p>
                          </div>
                          <button
                            onClick={() => setVerifyModal({ open: true, issue: iss, feedback: "" })}
                            className="shrink-0 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 cursor-pointer"
                          >
                            Verify Fix ⭐
                          </button>
                        </div>
                      )}

                      {isVerified && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                          <span>✓</span> Verified by Citizen · Case Closed
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: NEARBY CIVIC ISSUES
            ======================================================== */}
        {activeTab === "nearby" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Civic Issues in {user?.ward || "Your Vicinity"}
                </h3>
                <p className="text-xs text-slate-400">
                  Upvote local issues so municipal engineers prioritize repairs in your area.
                </p>
              </div>
              <Link to="/map" className="btn btn-soft text-xs">
                Open Map View 🗺️
              </Link>
            </div>

            {nearbyIssues.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
                <span className="text-4xl">🌟</span>
                <h4 className="mt-2 text-base font-bold text-white">No active issues in your ward right now</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Everything in your immediate area looks clean and reported issues are resolved.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {nearbyIssues.map((iss) => (
                  <div
                    key={iss.id}
                    className="card card-hover flex flex-col justify-between overflow-hidden p-4"
                  >
                    <div>
                      <div className="relative mb-3 h-32 w-full overflow-hidden rounded-2xl bg-slate-800">
                        <img
                          src={issuePhoto(iss)}
                          alt={iss.title}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          onError={(e) => (e.currentTarget.src = "/img/hero.jpg")}
                        />
                        <div className="absolute top-2 left-2">
                          <StatusBadge status={iss.status} />
                        </div>
                        <div className="absolute top-2 right-2">
                          <PriorityBadge priority={iss.priority} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-bold">
                        <span>{CATEGORY_EMOJI[iss.category] || "📍"}</span>
                        <span>{CATEGORY_LABELS[iss.category] || iss.category}</span>
                      </div>
                      <Link to={`/issues/${iss.id}`} className="mt-1 block">
                        <h4 className="font-bold text-white text-sm hover:text-blue-400 line-clamp-1">
                          #{iss.id} {iss.title}
                        </h4>
                      </Link>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">{iss.description}</p>
                    </div>

                    <div className="mt-4 border-t border-white/10 pt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-400 truncate max-w-[140px] text-[11px]">
                        📍 {iss.location}
                      </span>
                      <button
                        onClick={() => handleUpvote(iss.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1 font-bold text-slate-200 transition-all hover:bg-blue-600 hover:border-transparent hover:text-white cursor-pointer"
                      >
                        <span>👍</span>
                        <span>{iss.upvotes || 0}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: COMMUNITY ACTIVITY FEED
            ======================================================== */}
        {activeTab === "activity" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Live Community Activity</h3>
                <p className="text-xs text-slate-400">Real-time reports, status updates, and resolutions across the city.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                Live Feed
              </span>
            </div>

            <div className="divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
              {communityActivity.map((act) => (
                <div key={act.id} className="flex items-center justify-between p-4 transition hover:bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-lg border border-blue-500/20">
                      {CATEGORY_EMOJI[act.category] || "📍"}
                    </span>
                    <div>
                      <Link to={`/issues/${act.id}`} className="font-bold text-white text-sm hover:text-blue-400">
                        #{act.id} {act.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{act.ward || "City-wide"}</span>
                        <span>·</span>
                        <span>{act.user?.name || "Citizen"}</span>
                        <span>·</span>
                        <span>{timeAgo(act.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={act.status} />
                    <span className="hidden sm:inline-block text-xs font-bold text-slate-400">
                      👍 {act.upvotes || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: INTERACTIVE ANALYTICS (ALL 5 REQUIRED CHARTS)
            ======================================================== */}
        {activeTab === "analytics" && (
          <div className="mt-6 space-y-6">
            {/* Filter Bar */}
            <FilterBar filters={filters} onChange={setFilters} onReset={() => setFilters(emptyFilters)} />

            {/* Error Message */}
            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-300">
                ⚠️ {error}
              </div>
            )}

            {/* Grid of 5 Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Chart 1: Pie Chart - Issue Category Distribution */}
              <div className="card card-hover p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">Issue Category Distribution</h3>
                    <p className="text-xs text-slate-400">Breakdown of reported issues by civic category</p>
                  </div>
                  <span className="text-xs font-bold text-blue-400">Pie Chart</span>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="count"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={95}
                        paddingAngle={3}
                        label={(entry) => `${entry.count}`}
                      >
                        {categoryData.map((entry, i) => (
                          <Cell
                            key={entry.category}
                            fill={PALETTE[i % PALETTE.length]}
                            stroke="rgba(0,0,0,0.4)"
                            strokeWidth={2}
                            className="cursor-pointer hover:opacity-80 transition"
                            onClick={() => {
                              const foundKey = Object.keys(CATEGORY_LABELS).find((k) => CATEGORY_LABELS[k] === entry.category) || entry.category;
                              navigate(`/issues?category=${foundKey}`);
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipProps} />
                      <Legend {...legendProps} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Bar Chart - Monthly Report Statistics */}
              <div className="card card-hover p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">Monthly Report Statistics</h3>
                    <p className="text-xs text-slate-400">Volume of complaints logged per month</p>
                  </div>
                  <span className="text-xs font-bold text-cyan-400">Bar Chart</span>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"} />
                      <XAxis dataKey="label" tick={axisTick} />
                      <YAxis allowDecimals={false} tick={axisTick} />
                      <Tooltip {...tooltipProps} />
                      <Legend {...legendProps} />
                      <Bar dataKey="count" name="Complaints Reported" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Line Chart - Issue Resolution Trends */}
              <div className="card card-hover p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">Issue Resolution Trends</h3>
                    <p className="text-xs text-slate-400">Comparison of newly reported vs resolved complaints over time</p>
                  </div>
                  <span className="text-xs font-bold text-violet-400">Line Chart</span>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"} />
                      <XAxis dataKey="label" tick={axisTick} />
                      <YAxis allowDecimals={false} tick={axisTick} />
                      <Tooltip {...tooltipProps} />
                      <Legend {...legendProps} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Reported"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#3B82F6" }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="resolved"
                        name="Resolved"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#10B981" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Area Chart - Weekly Issue Reports */}
              <div className="card card-hover p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">Weekly Issue Reports</h3>
                    <p className="text-xs text-slate-400">14-day daily incoming vs resolved grievance velocity</p>
                  </div>
                  <span className="text-xs font-bold text-amber-400">Area Chart</span>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <defs>
                        <linearGradient id="areaReported" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="areaResolved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"} />
                      <XAxis dataKey="label" tick={{ ...axisTick, fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={axisTick} />
                      <Tooltip {...tooltipProps} />
                      <Legend {...legendProps} />
                      <Area
                        type="monotone"
                        dataKey="reported"
                        name="Reported"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#areaReported)"
                      />
                      <Area
                        type="monotone"
                        dataKey="resolved"
                        name="Resolved"
                        stroke="#06B6D4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#areaResolved)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 5: Horizontal Bar Chart - Department Performance */}
              <div className="card card-hover p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">Department Performance & Resolution Rate</h3>
                    <p className="text-xs text-slate-400">
                      Overall efficiency and resolution rate (%) across municipal divisions
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">Horizontal Bar Chart</span>
                </div>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={departmentData} margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"} />
                      <XAxis type="number" unit="%" domain={[0, 100]} tick={axisTick} />
                      <YAxis dataKey="shortName" type="category" width={110} tick={axisTick} />
                      <Tooltip {...tooltipProps} />
                      <Legend {...legendProps} />
                      <Bar
                        dataKey="resolutionRate"
                        name="Resolution Rate (%)"
                        fill="#06B6D4"
                        radius={[0, 6, 6, 0]}
                        className="cursor-pointer"
                        onClick={(d) => {
                          const cat = DEPT_TO_CAT[d.shortName];
                          if (cat) navigate(`/issues?category=${cat}`);
                          else navigate("/issues");
                        }}
                      >
                        {departmentData.map((d, i) => (
                          <Cell
                            key={d.name}
                            fill={d.resolutionRate > 50 ? "#10B981" : d.resolutionRate > 25 ? "#3B82F6" : "#F59E0B"}
                            className="cursor-pointer hover:opacity-80 transition"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: LEADERBOARD & CIVIC BADGES
            ======================================================== */}
        {activeTab === "leaderboard" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">Citizen Leaderboard</h3>
                <p className="text-xs text-slate-400">
                  Earn points by reporting issues, upvoting, and verifying completed resolutions!
                </p>
              </div>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300">
                Your Score: {userStats?.points || 0} pts · Rank #{userStats?.rank || "-"}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-white/10 bg-white/5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Citizen</th>
                    <th className="p-4">Ward</th>
                    <th className="p-4 text-center">Reports</th>
                    <th className="p-4 text-center">Resolved</th>
                    <th className="p-4 text-center">Badges</th>
                    <th className="p-4 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 font-medium">
                  {leaderboardData.map((c, idx) => {
                    const isMe = c.id === user?.id;
                    const rankMedal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;

                    return (
                      <tr
                        key={c.id}
                        className={`transition hover:bg-white/5 ${
                          isMe ? "bg-blue-600/15 font-bold text-white" : ""
                        }`}
                      >
                        <td className="p-4 text-sm font-black">{rankMedal}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/20 text-xs font-bold text-blue-300">
                              {c.name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <span>{c.name}</span>
                              {isMe && (
                                <span className="ml-2 rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-extrabold text-blue-300">
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-400">{c.ward || "City-wide"}</td>
                        <td className="p-4 text-center font-bold text-white">{c.reportsCount}</td>
                        <td className="p-4 text-center font-bold text-emerald-400">{c.resolvedCount}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {c.badges.map((b) => (
                              <span key={b.id} title={`${b.name}: ${b.desc}`} className="text-sm cursor-help">
                                {b.icon}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right font-black text-amber-400 text-sm">
                          {c.points} <span className="text-[10px] text-slate-500">pts</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          VERIFICATION MODAL
          ======================================================== */}
      {verifyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-900 p-6 shadow-2xl animate-pop">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Verify Resolution</h3>
              <button
                onClick={() => setVerifyModal({ open: false, issue: null, feedback: "" })}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Confirm that #{verifyModal.issue?.id} “{verifyModal.issue?.title}” has been satisfactorily fixed.
            </p>

            <form onSubmit={handleVerify} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Citizen Verification Feedback</label>
                <textarea
                  rows={3}
                  value={verifyModal.feedback}
                  onChange={(e) => setVerifyModal({ ...verifyModal, feedback: e.target.value })}
                  placeholder="e.g., Road was properly paved, clean and safe to drive now."
                  className="input mt-1 w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyModal({ open: false, issue: null, feedback: "" })}
                  className="btn btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn btn-primary text-xs flex items-center gap-1.5"
                >
                  <span>✓</span> Confirm & Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          BADGE & GAMIFICATION MODAL
          ======================================================== */}
      {badgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-slate-900 p-6 shadow-2xl animate-pop">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <h3 className="text-lg font-bold text-white">Civic Achievement Badges</h3>
              </div>
              <button onClick={() => setBadgeModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Your contribution points: <b className="text-amber-400">{userStats?.points || 0} pts</b> · City Rank: <b className="text-cyan-400">#{userStats?.rank || "-"}</b>
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {[
                { id: "pioneer", name: "Civic Pioneer", icon: "🌱", desc: "Reported first civic issue" },
                { id: "active", name: "Active Citizen", icon: "⭐", desc: "Reported 3+ issues" },
                { id: "guardian", name: "Ward Guardian", icon: "🛡️", desc: "Reported 5+ issues in ward" },
                { id: "champion", name: "Civic Champion", icon: "🏆", desc: "Reported 10+ civic issues" },
                { id: "impact", name: "Impact Maker", icon: "✨", desc: "2+ issues reached full resolution" },
                { id: "popular", name: "Community Voice", icon: "📢", desc: "Received 15+ community upvotes" },
              ].map((b) => {
                const unlocked = userStats?.badges?.some((ub) => ub.id === b.id);

                return (
                  <div
                    key={b.id}
                    className={`rounded-2xl border p-3 text-left transition-all ${
                      unlocked
                        ? "border-amber-500/40 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                        : "border-white/5 bg-white/5 opacity-50 grayscale"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{b.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{b.name}</p>
                        <p className="text-[10px] text-amber-300 font-semibold">{unlocked ? "UNLOCKED ✓" : "LOCKED 🔒"}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">{b.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button onClick={() => setBadgeModalOpen(false)} className="btn btn-soft text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}