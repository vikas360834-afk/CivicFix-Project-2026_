import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fmtDate, timeAgo, apiError, CATEGORY_LABELS, CATEGORY_EMOJI, issuePhoto } from "../utils.js";
import { PriorityBadge, StatusBadge } from "../components/Badges.jsx";

const CATEGORY_SLA_DAYS = {
  ROAD: 7,
  STREET_LIGHT: 3,
  WATER: 4,
  SANITATION: 2,
  ELECTRICITY: 2,
  PARK: 5,
  GAS: 1,
  OTHER: 5,
};

const QUICK_NOTES = [
  "Repairs completed: Road surface patched with bituminous mix and compacted.",
  "Streetlight fixture and LED luminaire replaced; tested functional.",
  "Drainage blockage cleared; water flow verified.",
  "Garbage cleared and municipal bin disinfected.",
  "Overhead power line re-tensioned and junction box sealed.",
  "Tree branch trimmed away from overhead cables; debris removed.",
];

export default function EngineerPanel() {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  // Tab filter: "all" | "assigned" | "in_progress" | "completed" | "overdue" | "reports"
  const [filterTab, setFilterTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Resolution Modal State
  const [resolveModal, setResolveModal] = useState({ open: false, issue: null, note: "" });
  const [resolvePhoto, setResolvePhoto] = useState(null); // { url, file }
  const photoUrlRef = useRef(null);

  // Completion Report Viewer Modal
  const [reportModal, setReportModal] = useState({ open: false, issue: null });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAssigned = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/issues/assigned");
      setIssues(data.issues || []);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssigned();
  }, [loadAssigned]);

  useEffect(() => {
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);

  // Compute lists
  const assignedList = useMemo(() => issues.filter((i) => i.status === "ASSIGNED"), [issues]);
  const inProgressList = useMemo(() => issues.filter((i) => i.status === "IN_PROGRESS"), [issues]);
  const completedList = useMemo(() => issues.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED"), [issues]);

  // SLA deadline calculation
  const getSLA = (issue) => {
    const slaDays = CATEGORY_SLA_DAYS[issue.category] || 5;
    const created = new Date(issue.createdAt).getTime();
    const deadline = new Date(created + slaDays * 86400000);
    const msLeft = deadline.getTime() - Date.now();
    const hoursLeft = Math.round(msLeft / 3600000);

    const isOverdue = msLeft < 0;
    const daysOverdue = Math.abs(Math.floor(msLeft / 86400000));

    return {
      deadline,
      isOverdue,
      hoursLeft,
      daysOverdue,
      slaDays,
    };
  };

  // Compute resolved this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const resolvedThisMonth = completedList.filter(
    (i) => i.resolvedAt && new Date(i.resolvedAt) >= startOfMonth
  ).length;

  // Average fix time in hours
  let avgFixTime = "—";
  const resolvedWithTimes = completedList.filter((i) => i.startedAt && i.resolvedAt);
  if (resolvedWithTimes.length > 0) {
    const totalMs = resolvedWithTimes.reduce((acc, i) => {
      return acc + (new Date(i.resolvedAt).getTime() - new Date(i.startedAt).getTime());
    }, 0);
    const avgHours = Math.round(totalMs / resolvedWithTimes.length / 3600000);
    avgFixTime = avgHours < 24 ? `${avgHours}h` : `${(avgHours / 24).toFixed(1)}d`;
  }

  // Action: Start Work
  const startWork = async (issueId) => {
    setBusy(true);
    try {
      await api.patch(`/issues/${issueId}/status`, { status: "IN_PROGRESS" });
      showToast(`Work started on issue #${issueId}! Status is now IN PROGRESS.`);
      await loadAssigned();
    } catch (err) {
      showToast(apiError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  // Open Resolve Modal
  const openResolveModal = (issue) => {
    setResolveModal({ open: true, issue, note: "" });
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    setResolvePhoto(null);
  };

  const closeResolveModal = () => {
    setResolveModal({ open: false, issue: null, note: "" });
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    setResolvePhoto(null);
  };

  const handlePickPhoto = (fileList) => {
    const file = fileList[0];
    if (!file) return;
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    const url = URL.createObjectURL(file);
    photoUrlRef.current = url;
    setResolvePhoto({ url, file });
  };

  // Action: Confirm Resolution
  const confirmResolution = async () => {
    if (!resolveModal.note.trim()) {
      showToast("Resolution note is required", "error");
      return;
    }
    const issueId = resolveModal.issue.id;
    setBusy(true);

    try {
      await api.patch(`/issues/${issueId}/status`, {
        status: "RESOLVED",
        note: resolveModal.note.trim(),
      });

      // Upload after-fix photo
      if (resolvePhoto) {
        const fd = new FormData();
        fd.append("images", resolvePhoto.file, resolvePhoto.file.name);
        await api.post(`/issues/${issueId}/images`, fd);
      }

      showToast(`Issue #${issueId} marked as RESOLVED! Proof uploaded ✅`);
      closeResolveModal();
      await loadAssigned();
    } catch (err) {
      showToast(apiError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  // Filtered issues based on active tab and search
  const displayedIssues = useMemo(() => {
    return issues.filter((iss) => {
      const matchSearch =
        !searchQuery ||
        iss.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        iss.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(iss.id).includes(searchQuery);

      if (!matchSearch) return false;

      const sla = getSLA(iss);
      if (filterTab === "assigned") return iss.status === "ASSIGNED";
      if (filterTab === "in_progress") return iss.status === "IN_PROGRESS";
      if (filterTab === "completed") return iss.status === "RESOLVED" || iss.status === "CLOSED";
      if (filterTab === "overdue") return sla.isOverdue && (iss.status === "ASSIGNED" || iss.status === "IN_PROGRESS");
      return true;
    });
  }, [issues, filterTab, searchQuery]);

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
        <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-cyan-600/10 blur-3xl" />
        <div className="absolute top-96 right-10 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ========================================================
            1. HEADER & ENGINEER STATS STRIP
            ======================================================== */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-[#10182A]/95 to-[#080D1A]/90 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-300">
                  FIELD OPERATIONS WORKSPACE
                </span>
                <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                  Ward: {user?.ward || "All Wards"}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                Engineer <span className="grad-text">Work Orders</span>
              </h1>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Signed in as <b className="text-white">{user?.name}</b> · Task deadlines, before-and-after photo uploads, and resolution sign-offs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={loadAssigned} disabled={loading} className="btn btn-primary text-xs">
                ↺ Refresh Orders
              </button>
              <Link to="/issues" className="btn btn-soft text-xs">
                Public Feed →
              </Link>
            </div>
          </div>

          {/* 4 Performance Metric Cards */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">Assigned Orders</p>
              <p className="mt-1 text-2xl font-black text-amber-400">{assignedList.length}</p>
              <p className="mt-0.5 text-[10px] text-amber-300">Ready to start</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">In Progress</p>
              <p className="mt-1 text-2xl font-black text-cyan-400">{inProgressList.length}</p>
              <p className="mt-0.5 text-[10px] text-cyan-300">Under active repair</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">Resolved This Month</p>
              <p className="mt-1 text-2xl font-black text-emerald-400">{resolvedThisMonth}</p>
              <p className="mt-0.5 text-[10px] text-emerald-300">Total completed: {completedList.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-[11px] font-semibold text-slate-400">Avg. Fix Velocity</p>
              <p className="mt-1 text-2xl font-black text-violet-400">{avgFixTime}</p>
              <p className="mt-0.5 text-[10px] text-violet-300">Start to completion</p>
            </div>
          </div>
        </div>

        {/* ========================================================
            2. FILTER TABS & SEARCH
            ======================================================== */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All Tasks", count: issues.length },
              { id: "assigned", label: "Assigned (Pending Start)", count: assignedList.length },
              { id: "in_progress", label: "In Progress", count: inProgressList.length },
              { id: "completed", label: "Completed Fixes", count: completedList.length },
              {
                id: "overdue",
                label: "Overdue SLA",
                count: issues.filter((i) => getSLA(i).isOverdue && i.status !== "RESOLVED" && i.status !== "CLOSED").length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  filterTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <span>{tab.label}</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search tasks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-8 text-xs"
            />
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              🔍
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* ========================================================
            3. WORK ORDER CARDS GRID
            ======================================================== */}
        <div className="mt-6">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading work orders…</div>
          ) : displayedIssues.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
              <span className="text-5xl">🛠️</span>
              <h3 className="mt-3 text-lg font-bold text-white">No tasks match this filter</h3>
              <p className="mt-1 text-xs text-slate-400">
                You're all caught up on this section or no orders match your search.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {displayedIssues.map((issue) => {
                const sla = getSLA(issue);
                const isAssigned = issue.status === "ASSIGNED";
                const isInProgress = issue.status === "IN_PROGRESS";
                const isCompleted = issue.status === "RESOLVED" || issue.status === "CLOSED";

                const mapsUrl =
                  issue.latitude && issue.longitude
                    ? `https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`
                    : null;

                return (
                  <div
                    key={issue.id}
                    className="card card-hover flex flex-col justify-between overflow-hidden p-5 border border-white/10 bg-[#10182A]/85 backdrop-blur-xl"
                  >
                    <div>
                      {/* Top status & urgency header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-blue-400">#{issue.id}</span>
                          <span className="chip text-[11px] py-0.5">
                            {CATEGORY_EMOJI[issue.category]} {CATEGORY_LABELS[issue.category] || issue.category}
                          </span>
                        </div>
                        <StatusBadge status={issue.status} />
                      </div>

                      {/* Title & Description */}
                      <Link to={`/issues/${issue.id}`} className="mt-3 block">
                        <h4 className="font-bold text-white text-base hover:text-blue-400 line-clamp-1">
                          {issue.title}
                        </h4>
                      </Link>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">{issue.description}</p>

                      {/* Location & Directions */}
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate">📍 {issue.location}</span>
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 font-bold text-cyan-400 hover:underline"
                          >
                            GPS Route ↗
                          </a>
                        )}
                      </div>

                      {/* SLA Urgency Countdown Strip */}
                      {!isCompleted && (
                        <div
                          className={`mt-3.5 flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-semibold ${
                            sla.isOverdue
                              ? "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                              : "bg-blue-500/10 border border-blue-500/20 text-blue-300"
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <span>⏱️</span>
                            <span>{sla.isOverdue ? "SLA Overdue" : "Target Deadline"}</span>
                          </span>
                          <span className="font-bold">
                            {sla.isOverdue ? `${sla.daysOverdue}d overdue` : `${Math.max(1, sla.hoursLeft)}h remaining`}
                          </span>
                        </div>
                      )}

                      {/* Photos thumbnail preview (Before photo) */}
                      {issue.images?.length > 0 && (
                        <div className="mt-3.5">
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                            Citizen Photo (Before):
                          </p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {issue.images.map((img) => (
                              <img
                                key={img.id}
                                src={img.url}
                                alt="Report"
                                className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resolution note if completed */}
                      {issue.resolutionNote && (
                        <div className="mt-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                          <p className="font-bold">✓ Signed Resolution Note:</p>
                          <p className="mt-0.5 text-emerald-300/90">{issue.resolutionNote}</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-5 border-t border-white/10 pt-4 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">🕒 {timeAgo(issue.createdAt)}</span>

                      <div className="flex items-center gap-2">
                        {isAssigned && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => startWork(issue.id)}
                            className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                          >
                            <span>▶</span>
                            <span>Start Work</span>
                          </button>
                        )}

                        {isInProgress && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openResolveModal(issue)}
                            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-bold text-slate-900 hover:brightness-110 shadow-lg shadow-emerald-500/25 cursor-pointer flex items-center gap-1"
                          >
                            <span>✓</span>
                            <span>Resolve & Upload Proof</span>
                          </button>
                        )}

                        {isCompleted && (
                          <button
                            type="button"
                            onClick={() => setReportModal({ open: true, issue })}
                            className="btn btn-soft text-xs py-1.5 px-3 flex items-center gap-1"
                          >
                            <span>📑</span>
                            <span>Completion Report</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          RESOLVE WORK ORDER MODAL (BEFORE-AND-AFTER PHOTO UPLOAD)
          ======================================================== */}
      {resolveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-slate-900 p-6 shadow-2xl animate-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Sign Off Work Order</h3>
                <p className="text-xs text-slate-400">
                  Issue #{resolveModal.issue?.id} · {resolveModal.issue?.title}
                </p>
              </div>
              <button onClick={closeResolveModal} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Before Photo Comparison Preview */}
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  1. Before-and-After Photo Proof
                </label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Before (Reported)</p>
                    <img
                      src={issuePhoto(resolveModal.issue)}
                      alt="Before"
                      className="h-28 w-full rounded-xl object-cover"
                      onError={(e) => (e.currentTarget.src = "/img/hero.jpg")}
                    />
                  </div>

                  <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-2 text-center flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-cyan-300 uppercase mb-1">After (Repaired Proof)</p>
                    {resolvePhoto ? (
                      <div className="relative h-28 w-full overflow-hidden rounded-xl">
                        <img src={resolvePhoto.url} alt="After" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setResolvePhoto(null)}
                          className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-[10px] text-white"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="flex h-28 w-full flex-col items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer">
                        <span className="text-2xl">📸</span>
                        <span className="mt-1 text-[11px] font-bold text-cyan-400">Upload Fixed Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePickPhoto(e.target.files)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick resolution note chips */}
              <div>
                <label className="text-xs font-semibold text-slate-300">2. Quick Resolution Note Templates</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {QUICK_NOTES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setResolveModal({ ...resolveModal, note: tmpl })}
                      className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                    >
                      {tmpl.slice(0, 32)}…
                    </button>
                  ))}
                </div>
              </div>

              {/* Note editor */}
              <div>
                <label className="text-xs font-semibold text-slate-300">Resolution Description (Required)</label>
                <textarea
                  rows={3}
                  value={resolveModal.note}
                  onChange={(e) => setResolveModal({ ...resolveModal, note: e.target.value })}
                  placeholder="Detail the work carried out, materials used, and safety verification…"
                  className="input mt-1 w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={closeResolveModal} className="btn btn-ghost text-xs">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !resolveModal.note.trim()}
                  onClick={confirmResolution}
                  className="btn btn-primary text-xs flex items-center gap-1.5"
                >
                  <span>✓</span> Sign Off & Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          COMPLETION REPORT VIEWER MODAL
          ======================================================== */}
      {reportModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-slate-900 p-6 shadow-2xl animate-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    OFFICIAL WORK COMPLETION REPORT
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-bold text-white">Issue #{reportModal.issue?.id} Repair Order</h3>
              </div>
              <button onClick={() => setReportModal({ open: false, issue: null })} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div>
                  <p className="text-slate-400">Category:</p>
                  <p className="font-bold text-white">{CATEGORY_LABELS[reportModal.issue?.category] || reportModal.issue?.category}</p>
                </div>
                <div>
                  <p className="text-slate-400">Ward:</p>
                  <p className="font-bold text-white">{reportModal.issue?.ward || "Bengaluru Metro"}</p>
                </div>
                <div>
                  <p className="text-slate-400">Location:</p>
                  <p className="font-bold text-white">{reportModal.issue?.location}</p>
                </div>
                <div>
                  <p className="text-slate-400">Date Resolved:</p>
                  <p className="font-bold text-emerald-400">{fmtDate(reportModal.issue?.resolvedAt || new Date())}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-300 mb-2">Before & After Visual Proof:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                    <p className="text-[10px] text-slate-400 mb-1">Before (Citizen Report)</p>
                    <img
                      src={reportModal.issue?.images?.[0]?.url || "/img/hero.jpg"}
                      alt="Before"
                      className="h-32 w-full object-cover rounded-lg"
                    />
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                    <p className="text-[10px] text-cyan-400 mb-1">After (Engineer Resolution Proof)</p>
                    <img
                      src={reportModal.issue?.images?.[1]?.url || reportModal.issue?.images?.[0]?.url || "/img/hero.jpg"}
                      alt="After"
                      className="h-32 w-full object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="font-bold text-slate-300">Signed Resolution Note:</p>
                <p className="mt-1 text-slate-400 leading-relaxed">
                  {reportModal.issue?.resolutionNote || "Issue satisfactorily fixed and certified safe."}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-soft text-xs flex items-center gap-1.5"
                >
                  <span>🖨️</span> Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setReportModal({ open: false, issue: null })}
                  className="btn btn-primary text-xs"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
