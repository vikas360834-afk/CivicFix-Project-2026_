import { useCallback, useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fmtDate, timeAgo, apiError, CATEGORY_LABELS, CATEGORY_EMOJI, STATUS_META, WARDS } from "../utils.js";
import { StatusBadge, PriorityBadge } from "../components/Badges.jsx";
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

const TABS = [
  { id: "pending", label: "Pending Approvals", icon: "⏳" },
  { id: "active", label: "Active Issues", icon: "⚡" },
  { id: "analytics", label: "Executive Analytics", icon: "📊" },
  { id: "assignments", label: "Engineer Management", icon: "👷" },
  { id: "auth", label: "Auth Security Audit", icon: "🛡️" },
  { id: "logs", label: "Activity Logs", icon: "📜" },
  { id: "users", label: "User Directory", icon: "👥" },
  { id: "archive", label: "Archive", icon: "📦" },
  { id: "export", label: "Export & Reports", icon: "📑" },
];

const PALETTE = ["#3B82F6", "#06B6D4", "#8B5CF6", "#10B981", "#F59E0B", "#F43F5E", "#6366F1", "#14B8A6"];

const ROLE_COLORS = {
  ADMIN: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  ENGINEER: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  USER: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

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

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "pending";
  const [tab, setTab] = useState(initialTab);

  // Data states
  const [overview, setOverview] = useState(null);
  const [pendingIssues, setPendingIssues] = useState([]);
  const [activeIssues, setActiveIssues] = useState([]);
  const [archiveIssues, setArchiveIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // Analytics states
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);

  // Filter & Search states
  const [activeSearch, setActiveSearch] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("");
  const [activeOverdueOnly, setActiveOverdueOnly] = useState(false);
  const [selectedPending, setSelectedPending] = useState(new Set());

  // Loading & notification states
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Modals state
  const [rejectModal, setRejectModal] = useState({ open: false, issue: null, reason: "" });
  const [assignModal, setAssignModal] = useState({ open: false, issue: null, engineerId: "", note: "" });

  // Theme check for charts
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

  // Load all admin data
  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        pendingRes,
        activeRes,
        usersRes,
        overviewRes,
        catRes,
        trendRes,
        weeklyRes,
        deptRes,
        logsRes,
        resResolved,
        resRejected,
      ] = await Promise.all([
        api.get("/issues/pending").catch(() => ({ data: { issues: [] } })),
        api.get("/issues?limit=150").catch(() => ({ data: { issues: [] } })),
        api.get("/users").catch(() => ({ data: { users: [] } })),
        api.get("/stats/overview").catch(() => ({ data: null })),
        api.get("/stats/category").catch(() => ({ data: { categories: [] } })),
        api.get("/stats/trend").catch(() => ({ data: { trend: [] } })),
        api.get("/stats/weekly").catch(() => ({ data: { weekly: [] } })),
        api.get("/stats/departments").catch(() => ({ data: { departments: [] } })),
        api.get("/stats/activity-logs").catch(() => ({ data: { logs: [] } })),
        api.get("/issues?status=RESOLVED&limit=100").catch(() => ({ data: { issues: [] } })),
        api.get("/issues?status=REJECTED&limit=100").catch(() => ({ data: { issues: [] } })),
      ]);

      setPendingIssues(pendingRes.data.issues || []);
      setActiveIssues(activeRes.data.issues || []);
      setUsers(usersRes.data.users || []);
      setEngineers((usersRes.data.users || []).filter((u) => u.role === "ENGINEER"));
      setOverview(overviewRes.data);
      setCategoryData(catRes.data.categories || []);
      setTrendData(trendRes.data.trend || []);
      setWeeklyData(weeklyRes.data.weekly || []);
      setDepartmentData(deptRes.data.departments || []);
      setActivityLogs(logsRes.data.logs || []);

      const combinedArchive = [...(resResolved.data.issues || []), ...(resRejected.data.issues || [])];
      combinedArchive.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      setArchiveIssues(combinedArchive);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Approve single issue
  const approveIssue = async (issueId, engineerId = null, note = "") => {
    setBusy(true);
    const prevPending = [...pendingIssues];
    setPendingIssues((prev) => prev.filter((i) => i.id !== issueId));

    try {
      await api.patch(`/issues/${issueId}/approve`, {
        engineerId: engineerId || undefined,
        note: note || undefined,
      });
      showToast(`Issue #${issueId} approved successfully`);
      loadAdminData();
    } catch (err) {
      setPendingIssues(prevPending);
      showToast(apiError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  // Bulk approve selected pending issues
  const bulkApprove = async () => {
    if (selectedPending.size === 0) return;
    setBusy(true);
    const toApprove = Array.from(selectedPending);
    const prevPending = [...pendingIssues];
    setPendingIssues((prev) => prev.filter((i) => !selectedPending.has(i.id)));
    setSelectedPending(new Set());

    try {
      for (const id of toApprove) {
        await api.patch(`/issues/${id}/approve`);
      }
      showToast(`${toApprove.length} issues approved`);
      loadAdminData();
    } catch (err) {
      setPendingIssues(prevPending);
      showToast(apiError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  // Reject issue
  const rejectIssue = async () => {
    if (!rejectModal.issue || !rejectModal.reason.trim()) {
      showToast("Rejection reason is required", "error");
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/issues/${rejectModal.issue.id}/reject`, {
        reason: rejectModal.reason.trim(),
      });
      showToast(`Issue #${rejectModal.issue.id} rejected`);
      setRejectModal({ open: false, issue: null, reason: "" });
      loadAdminData();
    } catch (err) {
      showToast(apiError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  // Assign issue to engineer
  const assignIssue = async () => {
    if (!assignModal.issue || !assignModal.engineerId) {
      showToast("Select an engineer to assign", "error");
      return;
    }
    setBusy(true);
    try {
      if (assignModal.issue.status === "PENDING_APPROVAL") {
        await api.patch(`/issues/${assignModal.issue.id}/approve`, {
          engineerId: parseInt(assignModal.engineerId, 10),
          note: assignModal.note,
        });
      } else {
        await api.patch(`/issues/${assignModal.issue.id}/assign`, {
          engineerId: parseInt(assignModal.engineerId, 10),
        });
      }
      showToast(`Issue #${assignModal.issue.id} assigned to engineer`);
      setAssignModal({ open: false, issue: null, engineerId: "", note: "" });
      loadAdminData();
    } catch (err) {
      showToast(apiError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  // Update user role
  const updateUserRole = async (userId, newRole) => {
    setBusy(true);
    try {
      await api.put(`/users/${userId}`, { role: newRole });
      showToast(`User role updated to ${newRole}`);
      loadAdminData();
    } catch (err) {
      showToast(apiError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  // Toggle selection for bulk actions
  const toggleSelect = (id) => {
    const next = new Set(selectedPending);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPending(next);
  };

  // Export to CSV helper
  const exportToCSV = (dataList, filename = "civicfix-issues-report.csv") => {
    const headers = ["ID", "Title", "Category", "Ward", "Status", "Priority", "Upvotes", "Created At", "Resolved At"];
    const rows = dataList.map((i) => [
      i.id,
      `"${(i.title || "").replace(/"/g, '""')}"`,
      i.category,
      `"${(i.ward || "").replace(/"/g, '""')}"`,
      i.status,
      i.priority,
      i.upvotes || 0,
      new Date(i.createdAt).toISOString().slice(0, 10),
      i.resolvedAt ? new Date(i.resolvedAt).toISOString().slice(0, 10) : "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${dataList.length} records to CSV`);
  };

  // Filter active issues
  const filteredActiveIssues = useMemo(() => {
    return activeIssues.filter((i) => {
      const matchSearch =
        !activeSearch ||
        i.title.toLowerCase().includes(activeSearch.toLowerCase()) ||
        i.location.toLowerCase().includes(activeSearch.toLowerCase()) ||
        String(i.id).includes(activeSearch);
      const matchCategory = !activeCategoryFilter || i.category === activeCategoryFilter;
      const matchOverdue = !activeOverdueOnly || i.isOverdue;
      return matchSearch && matchCategory && matchOverdue;
    });
  }, [activeIssues, activeSearch, activeCategoryFilter, activeOverdueOnly]);

  const overdueCount = useMemo(() => {
    return activeIssues.filter((i) => i.isOverdue).length + pendingIssues.filter((i) => i.isOverdue).length;
  }, [activeIssues, pendingIssues]);

  return (
    <div className="relative isolate min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-2xl transition-all ${
            toast.type === "error"
              ? "bg-rose-950/90 text-rose-200 border border-rose-500/40 shadow-rose-950/50"
              : "bg-blue-950/90 text-blue-100 border border-blue-500/40 shadow-blue-950/50"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✅"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Background glow lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute top-96 left-10 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ========================================================
            1. EXECUTIVE TOP KPI STRIP & HEADER
            ======================================================== */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-[#10182A]/95 to-[#080D1A]/90 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-violet-500/30 bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-300">
                  MUNICIPAL COMMAND CONSOLE
                </span>
                <span className="rounded-xl border border-blue-500/30 bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-300">
                  CivicFix CityOps
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                Admin <span className="grad-text">Command Center</span>
              </h1>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Signed in as <b className="text-white">{user?.name}</b> · Centralized triage, engineer dispatch, and civic intelligence.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => exportToCSV(activeIssues, "civicfix-active-issues.csv")}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 cursor-pointer"
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 cursor-pointer"
              >
                <span>🖨️</span>
                <span>Print PDF</span>
              </button>
              <button
                onClick={loadAdminData}
                disabled={loading}
                className="btn btn-primary text-xs flex items-center gap-1.5"
              >
                <span>↺</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* 6 Executive KPI Cards */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">Total Issues</p>
              <p className="mt-1 text-2xl font-black text-white">{overview?.total ?? 0}</p>
              <p className="mt-0.5 text-[10px] text-blue-400">All city records</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">Open Issues</p>
              <p className="mt-1 text-2xl font-black text-amber-400">{overview?.open ?? 0}</p>
              <p className="mt-0.5 text-[10px] text-amber-300">Awaiting triage/dispatch</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">In Progress</p>
              <p className="mt-1 text-2xl font-black text-cyan-400">{overview?.inProgress ?? 0}</p>
              <p className="mt-0.5 text-[10px] text-cyan-300">Under active repair</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">Resolved</p>
              <p className="mt-1 text-2xl font-black text-emerald-400">{overview?.resolved ?? 0}</p>
              <p className="mt-0.5 text-[10px] text-emerald-300">{overview?.resolvedRate ?? 0}% success rate</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">Pending Approval</p>
              <p className="mt-1 text-2xl font-black text-violet-400">{pendingIssues.length}</p>
              <p className="mt-0.5 text-[10px] text-violet-300">Needs admin sign-off</p>
            </div>
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-rose-300">SLA Overdue</p>
              <p className="mt-1 text-2xl font-black text-rose-400">{overdueCount}</p>
              <p className="mt-0.5 text-[10px] text-rose-300">Escalated reports</p>
            </div>
          </div>
        </div>

        {/* ========================================================
            2. TAB NAVIGATION
            ======================================================== */}
        <div className="mt-8 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const isActive = tab === t.id;
              let badgeCount = null;
              if (t.id === "pending") badgeCount = pendingIssues.length;
              if (t.id === "active") badgeCount = activeIssues.length;

              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                  {badgeCount !== null && badgeCount > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        t.id === "pending"
                          ? "bg-amber-500 text-slate-900"
                          : isActive
                          ? "bg-white/25 text-white"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* ========================================================
            TAB 1: PENDING APPROVAL QUEUE (WITH AI DUPLICATE CHECK)
            ======================================================== */}
        {tab === "pending" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div>
                <h2 className="text-base font-bold text-white">
                  Pending Citizen Reports Queue ({pendingIssues.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Verify validity, review AI duplicate warnings, and dispatch engineers.
                </p>
              </div>

              {pendingIssues.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPending.size === pendingIssues.length) {
                        setSelectedPending(new Set());
                      } else {
                        setSelectedPending(new Set(pendingIssues.map((i) => i.id)));
                      }
                    }}
                    className="btn btn-soft text-xs"
                  >
                    {selectedPending.size === pendingIssues.length ? "Deselect All" : "Select All"}
                  </button>
                  <button
                    type="button"
                    disabled={selectedPending.size === 0 || busy}
                    onClick={bulkApprove}
                    className="btn btn-primary text-xs"
                  >
                    ⚡ Bulk Approve ({selectedPending.size})
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                Loading pending queue…
              </div>
            ) : pendingIssues.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
                <span className="text-5xl">✨</span>
                <h3 className="mt-3 text-lg font-bold text-white">Pending Queue is clear!</h3>
                <p className="mt-1 text-xs text-slate-400">
                  All submitted citizen issues have been verified and processed.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingIssues.map((issue) => {
                  const isSelected = selectedPending.has(issue.id);

                  return (
                    <div
                      key={issue.id}
                      className={`card relative overflow-hidden p-5 transition-all duration-200 border ${
                        isSelected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-white/10"
                      }`}
                    >
                      {/* Duplicate warning card if detected */}
                      {issue.duplicateWarning && (
                        <div className="mb-4 flex items-start gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200">
                          <span className="text-base">⚠️</span>
                          <div>
                            <p className="font-bold">Automated Duplicate Warning</p>
                            <p className="mt-0.5">{issue.duplicateWarning.message}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        {/* Checkbox + Info */}
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(issue.id)}
                            className="mt-1.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-400">#{issue.id}</span>
                              <span className="chip text-xs">
                                {CATEGORY_EMOJI[issue.category]} {CATEGORY_LABELS[issue.category] || issue.category}
                              </span>
                              <PriorityBadge priority={issue.priority} />
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/30">
                                PENDING APPROVAL
                              </span>
                            </div>

                            <h3 className="mt-2 text-lg font-bold text-white">{issue.title}</h3>
                            <p className="mt-1 text-sm text-slate-300">{issue.description}</p>

                            {/* AI analysis metadata */}
                            {issue.aiDepartment && (
                              <div className="mt-3 flex items-center gap-2 text-xs text-cyan-400">
                                <span>🤖 AI Recommendation:</span>
                                <span className="font-medium">
                                  Category: <b>{issue.aiCategory}</b> · Priority: <b>{issue.aiPriority}</b> · Suggested Dept:{" "}
                                  <b>{issue.aiDepartment}</b>
                                </span>
                              </div>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                              <span>📍 {issue.location}</span>
                              {issue.ward && <span>🏛️ {issue.ward}</span>}
                              <span>👤 {issue.user?.name || "Citizen"}</span>
                              <span>🕒 {fmtDate(issue.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Photos */}
                        {issue.images?.length > 0 && (
                          <div className="flex shrink-0 gap-2">
                            {issue.images.map((img) => (
                              <a
                                key={img.id}
                                href={img.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group relative h-20 w-20 overflow-hidden rounded-2xl border border-white/10"
                              >
                                <img
                                  src={img.url}
                                  alt="Report attachment"
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => approveIssue(issue.id)}
                            className="btn btn-primary text-xs py-2 px-3"
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setAssignModal({ open: true, issue, engineerId: "", note: "" })}
                            className="btn btn-soft text-xs py-2 px-3"
                          >
                            ✓ Approve & Assign
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setRejectModal({ open: true, issue, reason: "" })}
                            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: ACTIVE ISSUES MANAGEMENT & SLA MONITOR
            ======================================================== */}
        {tab === "active" && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <input
                  type="text"
                  placeholder="Search by ID, title, location…"
                  value={activeSearch}
                  onChange={(e) => setActiveSearch(e.target.value)}
                  className="input text-xs max-w-xs"
                />
                <select
                  value={activeCategoryFilter}
                  onChange={(e) => setActiveCategoryFilter(e.target.value)}
                  className="input text-xs max-w-[180px]"
                >
                  <option value="">All Categories</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeOverdueOnly}
                    onChange={(e) => setActiveOverdueOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-rose-500"
                  />
                  <span>⚠️ Overdue SLA Only ({overdueCount})</span>
                </label>
              </div>

              <div className="text-xs font-bold text-slate-400">
                Showing {filteredActiveIssues.length} of {activeIssues.length} issues
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 bg-white/5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Ward</th>
                      <th className="px-4 py-3">Assigned Engineer</th>
                      <th className="px-4 py-3">Reported</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredActiveIssues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3 font-mono font-bold text-blue-400">#{issue.id}</td>
                        <td className="px-4 py-3 font-medium text-white max-w-xs truncate">
                          <Link to={`/issues/${issue.id}`} className="hover:text-blue-400 hover:underline">
                            {issue.title}
                          </Link>
                          {issue.isOverdue && (
                            <span className="ml-2 inline-block rounded-md bg-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-500/30">
                              OVERDUE
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="chip text-[11px]">
                            {CATEGORY_EMOJI[issue.category]} {CATEGORY_LABELS[issue.category] || issue.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={issue.status} />
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={issue.priority} />
                        </td>
                        <td className="px-4 py-3 text-slate-400">{issue.ward || "—"}</td>
                        <td className="px-4 py-3">
                          {issue.assignedTo ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-1 text-[11px] font-semibold text-blue-300 border border-blue-500/30">
                              🔧 {issue.assignedTo.name}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-amber-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{fmtDate(issue.createdAt)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setAssignModal({
                                open: true,
                                issue,
                                engineerId: issue.assignedToId || "",
                                note: "",
                              })
                            }
                            className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-white/10 hover:border-white/20"
                          >
                            {issue.assignedToId ? "Reassign" : "Assign"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: EXECUTIVE ANALYTICS (ALL REQUIRED CHARTS)
            ======================================================== */}
        {tab === "analytics" && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Category distribution */}
              <div className="card card-hover p-6">
                <h3 className="font-bold text-white text-base mb-1">Issue Category Distribution</h3>
                <p className="text-xs text-slate-400 mb-4">Pie chart distribution across municipal categories</p>
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
                        label={(e) => `${e.count}`}
                      >
                        {categoryData.map((e, idx) => (
                          <Cell
                            key={e.category}
                            fill={PALETTE[idx % PALETTE.length]}
                            stroke="rgba(0,0,0,0.4)"
                            strokeWidth={2}
                            className="cursor-pointer hover:opacity-80 transition"
                            onClick={() => {
                              setActiveCategoryFilter(e.category);
                              setTab("active");
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

              {/* Monthly stats */}
              <div className="card card-hover p-6">
                <h3 className="font-bold text-white text-base mb-1">Monthly Report Statistics</h3>
                <p className="text-xs text-slate-400 mb-4">Bar chart of incoming reports per month</p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"} />
                      <XAxis dataKey="label" tick={axisTick} />
                      <YAxis allowDecimals={false} tick={axisTick} />
                      <Tooltip {...tooltipProps} />
                      <Legend {...legendProps} />
                      <Bar dataKey="count" name="Reported" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Resolution Trend */}
              <div className="card card-hover p-6">
                <h3 className="font-bold text-white text-base mb-1">Issue Resolution Trends</h3>
                <p className="text-xs text-slate-400 mb-4">Line chart comparison of complaints reported vs resolved</p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"} />
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

              {/* Weekly flow */}
              <div className="card card-hover p-6">
                <h3 className="font-bold text-white text-base mb-1">Weekly Issue Reports</h3>
                <p className="text-xs text-slate-400 mb-4">14-day daily grievance flow</p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"} />
                      <XAxis dataKey="label" tick={{ ...axisTick, fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={axisTick} />
                      <Tooltip {...tooltipProps} />
                      <Legend {...legendProps} />
                      <Area type="monotone" dataKey="reported" name="Reported" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department Performance */}
              <div className="card card-hover p-6 lg:col-span-2">
                <h3 className="font-bold text-white text-base mb-1">Department Performance</h3>
                <p className="text-xs text-slate-400 mb-4">Horizontal bar chart of department resolution percentage</p>
                <div className="h-[300px] w-full">
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
                          if (cat) {
                            setActiveCategoryFilter(cat);
                            setTab("active");
                          }
                        }}
                      >
                        {departmentData.map((d) => (
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
            TAB 4: ENGINEER MANAGEMENT & DISPATCH
            ======================================================== */}
        {tab === "assignments" && (
          <div className="mt-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Engineer Workload Distribution</h2>
              <p className="text-xs text-slate-400">Track active work orders, assignments, and resolution capacity</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {engineers.map((eng) => {
                const engIssues = activeIssues.filter((i) => i.assignedToId === eng.id);
                const inProg = engIssues.filter((i) => i.status === "IN_PROGRESS").length;
                const assigned = engIssues.filter((i) => i.status === "ASSIGNED").length;

                return (
                  <div key={eng.id} className="card p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white">{eng.name}</h3>
                        <p className="text-xs text-slate-400">{eng.email}</p>
                      </div>
                      <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-300 border border-blue-500/30">
                        {eng.ward || "All Wards"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
                        <p className="text-xs text-slate-400">Assigned</p>
                        <p className="text-lg font-black text-amber-400">{assigned}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
                        <p className="text-xs text-slate-400">In Progress</p>
                        <p className="text-lg font-black text-blue-400">{inProg}</p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-white/10 pt-3">
                      <p className="text-xs font-semibold text-slate-400">Active Work Orders ({engIssues.length}):</p>
                      <ul className="mt-2 space-y-1 text-xs text-slate-300">
                        {engIssues.slice(0, 3).map((i) => (
                          <li key={i.id} className="truncate">
                            • <Link to={`/issues/${i.id}`} className="hover:underline hover:text-blue-400">#{i.id} {i.title}</Link>
                          </li>
                        ))}
                        {engIssues.length === 0 && <li className="text-slate-500">No active work orders</li>}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: ADMIN ACTIVITY LOGS (AUDIT TRAIL)
            ======================================================== */}
        {tab === "logs" && (
          <div className="mt-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">System Activity & Audit Logs</h2>
              <p className="text-xs text-slate-400">Full auditable history of status transitions and approvals.</p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 bg-white/5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Issue</th>
                      <th className="px-4 py-3">Transition</th>
                      <th className="px-4 py-3">Actor</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {activityLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{timeAgo(l.timestamp)}</td>
                        <td className="px-4 py-3">
                          <Link to={`/issues/${l.issueId}`} className="font-bold text-white hover:text-blue-400">
                            #{l.issueId} {l.issueTitle}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-400">{l.fromStatus || "START"}</span>
                          <span className="mx-1.5 text-blue-400">→</span>
                          <span className="font-bold text-emerald-400">{l.toStatus}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-white">{l.actor.name}</span>{" "}
                          <span className="text-[10px] text-slate-400">({l.actor.role})</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{l.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 6: USER DIRECTORY
            ======================================================== */}
        {tab === "users" && (
          <div className="mt-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">User & Staff Management ({users.length})</h2>
              <p className="text-xs text-slate-400">Manage user roles and municipal field assignments</p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 bg-white/5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Ward</th>
                      <th className="px-4 py-3 font-semibold">Joined</th>
                      <th className="px-4 py-3 font-semibold">Role Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                        <td className="px-4 py-3 text-slate-400">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[u.role] || ROLE_COLORS.USER}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{u.ward || "—"}</td>
                        <td className="px-4 py-3 text-slate-400">{fmtDate(u.createdAt)}</td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            disabled={busy || u.id === user?.id}
                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                            className="input py-1 text-xs max-w-[130px]"
                          >
                            <option value="USER">Citizen</option>
                            <option value="ENGINEER">Engineer</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 7: ARCHIVE
            ======================================================== */}
        {tab === "archive" && (
          <div className="mt-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Resolved & Rejected Archive ({archiveIssues.length})</h2>
              <p className="text-xs text-slate-400">Historical archive of completed fixes and dismissed complaints</p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 bg-white/5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Ward</th>
                      <th className="px-4 py-3">Resolution Note</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {archiveIssues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3 font-mono font-bold text-blue-400">#{issue.id}</td>
                        <td className="px-4 py-3 font-medium text-white max-w-xs truncate">
                          <Link to={`/issues/${issue.id}`} className="hover:text-blue-400 hover:underline">
                            {issue.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="chip text-[11px]">
                            {CATEGORY_EMOJI[issue.category]} {CATEGORY_LABELS[issue.category] || issue.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={issue.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-400">{issue.ward || "—"}</td>
                        <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                          {issue.resolutionNote || issue.rejectionReason || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{fmtDate(issue.updatedAt || issue.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: AUTH SECURITY AUDIT
            ======================================================== */}
        {tab === "auth" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🛡️</span> Authentication Security & Audit Dashboard
                </h2>
                <p className="text-xs text-slate-400">
                  Track successful logins, credential failures, session revocations, and brute-force indicators.
                </p>
              </div>
              <Link
                to="/admin/auth-analytics"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
              >
                Open Full Security Suite ↗
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-3xl">📊</span>
                  <h3 className="font-bold text-white text-base mt-3">Auth Success vs Failure</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Visualise login attempt pass rates, password error ratios, and unauthorized request blocks.
                  </p>
                </div>
                <Link
                  to="/admin/auth-analytics"
                  className="btn btn-primary text-xs mt-6 w-full text-center"
                >
                  View Error Distribution
                </Link>
              </div>

              <div className="card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-3xl">📉</span>
                  <h3 className="font-bold text-white text-base mt-3">14-Day Activity Trends</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Daily bar and line charts monitoring authentication activity and incident spikes.
                  </p>
                </div>
                <Link
                  to="/admin/auth-analytics"
                  className="btn btn-soft text-xs mt-6 w-full text-center"
                >
                  Inspect Incident Trend
                </Link>
              </div>

              <div className="card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-3xl">📜</span>
                  <h3 className="font-bold text-white text-base mt-3">Real-time Audit Trail</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Detailed chronological activity table with role, IP address, event type, and failure reason.
                  </p>
                </div>
                <Link
                  to="/admin/auth-analytics"
                  className="btn btn-soft text-xs mt-6 w-full text-center"
                >
                  Browse Event Log
                </Link>
              </div>
            </div>
          </div>
        )}
        {tab === "export" && (
          <div className="mt-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Reporting & Export Center</h2>
              <p className="text-xs text-slate-400">Generate CSV exports and printable audit summaries for municipal review.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-3xl">📊</span>
                  <h3 className="font-bold text-white text-base mt-3">Active Issues Dataset</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Download full dataset of all currently open, assigned, and in-progress civic reports.
                  </p>
                </div>
                <button
                  onClick={() => exportToCSV(activeIssues, "civicfix-active-issues.csv")}
                  className="btn btn-primary text-xs mt-6 w-full"
                >
                  Download Active Issues (CSV)
                </button>
              </div>

              <div className="card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-3xl">✅</span>
                  <h3 className="font-bold text-white text-base mt-3">Resolved Archive Dataset</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Export full historical archive of resolved civic work orders with timestamps.
                  </p>
                </div>
                <button
                  onClick={() => exportToCSV(archiveIssues, "civicfix-archive.csv")}
                  className="btn btn-soft text-xs mt-6 w-full"
                >
                  Download Resolved Archive (CSV)
                </button>
              </div>

              <div className="card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-3xl">🖨️</span>
                  <h3 className="font-bold text-white text-base mt-3">Printable PDF Report</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Format and print the municipal command dashboard into a standard executive summary.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="btn btn-soft text-xs mt-6 w-full"
                >
                  Generate PDF Summary
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          ASSIGN ENGINEER MODAL
          ======================================================== */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-900 p-6 shadow-2xl animate-pop">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Assign Work Order</h3>
              <button
                onClick={() => setAssignModal({ open: false, issue: null, engineerId: "", note: "" })}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Assign #{assignModal.issue?.id} “{assignModal.issue?.title}” to a qualified ward engineer.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Select Ward Engineer</label>
                <select
                  value={assignModal.engineerId}
                  onChange={(e) => setAssignModal({ ...assignModal, engineerId: e.target.value })}
                  className="input mt-1 w-full text-xs"
                >
                  <option value="">-- Choose Engineer --</option>
                  {engineers.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name} ({eng.department || eng.ward || "Field Staff"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Assignment / Dispatch Note (Optional)</label>
                <textarea
                  rows={3}
                  value={assignModal.note}
                  onChange={(e) => setAssignModal({ ...assignModal, note: e.target.value })}
                  placeholder="e.g., Priority asphalt patch required before monsoon."
                  className="input mt-1 w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModal({ open: false, issue: null, engineerId: "", note: "" })}
                  className="btn btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !assignModal.engineerId}
                  onClick={assignIssue}
                  className="btn btn-primary text-xs"
                >
                  Confirm & Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          REJECT MODAL
          ======================================================== */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-900 p-6 shadow-2xl animate-pop">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Reject Civic Report</h3>
              <button
                onClick={() => setRejectModal({ open: false, issue: null, reason: "" })}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Provide an official reason for rejecting issue #{rejectModal.issue?.id}. This will be logged in the audit trail.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Rejection Reason</label>
                <textarea
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  placeholder="e.g., Duplicate report, private property outside municipal jurisdiction, or unclear location."
                  className="input mt-1 w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModal({ open: false, issue: null, reason: "" })}
                  className="btn btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !rejectModal.reason.trim()}
                  onClick={rejectIssue}
                  className="rounded-xl border border-rose-500/30 bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
