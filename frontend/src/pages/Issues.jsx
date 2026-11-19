import { useCallback, useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/client.js";
import IssueCard from "../components/IssueCard.jsx";
import FilterBar from "../components/FilterBar.jsx";
import { StatusBadge, PriorityBadge, CategoryChip } from "../components/Badges.jsx";
import { fmtDate, timeAgo, apiError, CATEGORY_LABELS, CATEGORY_EMOJI, STATUS_META, issuePhoto } from "../utils.js";

const emptyFilters = {
  category: "",
  status: "",
  ward: "",
  priority: "",
  from: "",
  to: "",
  q: "",
  sort: "createdAt",
};

const SORTS = [
  { key: "createdAt", label: "🕒 Newest" },
  { key: "upvotes", label: "👍 Most upvotes" },
  { key: "priority", label: "🔥 Priority" },
];

const TIMELINE_STEPS = [
  { key: "PENDING_APPROVAL", label: "Reported" },
  { key: "OPEN", label: "Approved" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CLOSED", label: "Verified" },
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

function SkeletonGrid() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-4 border border-white/10 bg-white/5">
          <div className="flex gap-2">
            <div className="skeleton h-6 w-24" />
            <div className="skeleton ml-auto h-6 w-16" />
          </div>
          <div className="skeleton mt-3 h-4 w-4/5" />
          <div className="skeleton mt-2 h-3 w-full" />
          <div className="skeleton mt-1.5 h-3 w-2/3" />
          <div className="mt-4 flex justify-between">
            <div className="skeleton h-5 w-28" />
            <div className="skeleton h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Issues() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ ...emptyFilters, category: params.get("category") || "" });
  const [data, setData] = useState({ issues: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Drawer state
  const [drawerIssue, setDrawerIssue] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerFull, setDrawerFull] = useState(null);
  const [upvoteBusy, setUpvoteBusy] = useState(false);

  const fetchIssues = useCallback(async (f) => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== "")).toString();
      const { data: res } = await api.get(`/issues?${query}`);
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load issues.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues(filters);
  }, [fetchIssues, filters]);

  const changeFilter = (next) => setFilters(next);
  const reset = () => setFilters(emptyFilters);

  // Open drawer and fetch full issue details including comments & history
  const openDrawer = async (issue) => {
    setDrawerIssue(issue);
    setDrawerLoading(true);
    try {
      const { data: res } = await api.get(`/issues/${issue.id}`);
      setDrawerFull(res.issue);
    } catch {
      setDrawerFull(issue);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerIssue(null);
    setDrawerFull(null);
  };

  // Upvote in drawer
  const handleDrawerUpvote = async () => {
    if (!drawerIssue || upvoteBusy) return;
    setUpvoteBusy(true);
    try {
      const { data: res } = await api.post(`/issues/${drawerIssue.id}/upvote`);
      setDrawerFull((prev) => prev ? { ...prev, upvotes: res.upvotes } : null);
      setData((prev) => ({
        ...prev,
        issues: prev.issues.map((i) => (i.id === drawerIssue.id ? { ...i, upvotes: res.upvotes } : i)),
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setUpvoteBusy(false);
    }
  };

  return (
    <div className="relative isolate min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
                PUBLIC CIVIC REPOSITORY
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Civic <span className="grad-text">Issues Feed</span>
            </h1>
            <p className="mt-1 flex items-center gap-2 text-xs text-slate-400 sm:text-sm">
              <span className="chip chip-active">{data.total} reports</span>
              Search and filter by category, location, date, priority, or status
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                🔍
              </span>
              <input
                placeholder="Search issues, road, ward…"
                value={filters.q}
                onChange={(e) => changeFilter({ ...filters, q: e.target.value, page: 1 })}
                className="input pl-9 text-xs"
              />
            </div>
            <div className="flex gap-1.5">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => changeFilter({ ...filters, sort: s.key, page: 1 })}
                  className={`chip text-xs ${filters.sort === s.key ? "chip-active" : ""}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Bar with date and priority filters */}
        <FilterBar filters={filters} onChange={changeFilter} onReset={reset} showDate={true} />

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-xs font-bold text-rose-300">
            <span>⚠️</span> {error}
          </div>
        )}

        {loading ? (
          <SkeletonGrid />
        ) : data.issues.length === 0 ? (
          <div className="card pop mt-8 border-dashed border-white/20 bg-white/5 p-12 text-center backdrop-blur-xl">
            <span className="text-5xl">🗂️</span>
            <p className="mt-3 text-lg font-bold text-white">No issues match these filters</p>
            <p className="mt-1 text-xs text-slate-400">Try clearing your filters or report a new grievance.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button onClick={reset} className="btn btn-soft text-xs">
                ↺ Reset filters
              </button>
              <Link to="/report" className="btn btn-primary text-xs">
                + Report an issue
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} onQuickView={openDrawer} />
              ))}
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  disabled={data.page <= 1}
                  onClick={() => changeFilter({ ...filters, page: data.page - 1 })}
                  className="btn btn-soft text-xs disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="px-3 text-xs font-bold text-slate-400">
                  Page <b className="text-white">{data.page}</b> / {data.pages}
                </span>
                <button
                  disabled={data.page >= data.pages}
                  onClick={() => changeFilter({ ...filters, page: data.page + 1 })}
                  className="btn btn-soft text-xs disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================
          SLIDE-OVER ISSUE DETAIL DRAWER
          ======================================================== */}
      {drawerIssue && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300"
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-md transform overflow-y-auto border-l border-white/10 bg-slate-900 p-6 shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-blue-400">#{drawerIssue.id}</span>
                  <CategoryChip category={drawerIssue.category} />
                </div>
                <button onClick={closeDrawer} className="text-slate-400 hover:text-white p-1 text-base">
                  ✕
                </button>
              </div>

              {drawerLoading ? (
                <div className="py-16 text-center text-xs text-slate-400">Loading details…</div>
              ) : (
                <div className="mt-5 space-y-5 text-xs">
                  {/* Photo Banner */}
                  <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-slate-800 border border-white/10">
                    <img
                      src={issuePhoto(drawerFull || drawerIssue)}
                      alt="Banner"
                      className="h-full w-full object-cover"
                      onError={(e) => (e.currentTarget.src = "/img/hero.jpg")}
                    />
                    <div className="absolute top-2 left-2">
                      <StatusBadge status={(drawerFull || drawerIssue).status} />
                    </div>
                    <div className="absolute top-2 right-2">
                      <PriorityBadge priority={(drawerFull || drawerIssue).priority} />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-white">{(drawerFull || drawerIssue).title}</h2>
                    <p className="mt-2 text-slate-300 leading-relaxed">
                      {(drawerFull || drawerIssue).description}
                    </p>
                  </div>

                  {/* Location & Metadata */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Location:</span>
                      <span className="font-bold text-white">{(drawerFull || drawerIssue).location}</span>
                    </div>
                    {(drawerFull || drawerIssue).ward && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Ward:</span>
                        <span className="font-bold text-white">{(drawerFull || drawerIssue).ward}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Reported On:</span>
                      <span className="font-bold text-slate-300">{fmtDate((drawerFull || drawerIssue).createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Community Upvotes:</span>
                      <span className="font-bold text-amber-400">👍 {(drawerFull || drawerIssue).upvotes || 0}</span>
                    </div>
                  </div>

                  {/* 7-Stage Progression Timeline */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="font-bold text-white text-xs uppercase tracking-wider mb-3">
                      Lifecycle Progression
                    </p>
                    <div className="space-y-2.5">
                      {TIMELINE_STEPS.map((step, idx) => {
                        const currentIdx = getTimelineIndex((drawerFull || drawerIssue).status);
                        const isDone = currentIdx >= idx;
                        const isCurrent = currentIdx === idx;

                        return (
                          <div key={step.key} className="flex items-center gap-3">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                isCurrent
                                  ? "bg-cyan-400 text-slate-900 ring-2 ring-cyan-400/50"
                                  : isDone
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-800 text-slate-600"
                              }`}
                            >
                              {isDone ? "✓" : idx + 1}
                            </span>
                            <span
                              className={`font-semibold ${
                                isCurrent ? "text-cyan-400 font-bold" : isDone ? "text-slate-200" : "text-slate-500"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-3 pt-3">
                    <button
                      onClick={handleDrawerUpvote}
                      disabled={upvoteBusy}
                      className="btn btn-soft flex-1 text-xs flex items-center justify-center gap-1.5"
                    >
                      <span>👍</span>
                      <span>Upvote ({(drawerFull || drawerIssue).upvotes || 0})</span>
                    </button>
                    <Link
                      to={`/issues/${(drawerFull || drawerIssue).id}`}
                      className="btn btn-primary flex-1 text-xs text-center"
                    >
                      Full Details Page →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
