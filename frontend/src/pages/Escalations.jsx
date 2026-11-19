import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { StatusBadge, PriorityBadge, CategoryChip } from "../components/Badges.jsx";
import { timeAgo, fmtDate, issuePhoto } from "../utils.js";
import {
  AlertTriangle,
  Clock,
  Flame,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Filter,
  Search,
  ExternalLink
} from "lucide-react";

export default function Escalations() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedWard, setSelectedWard] = useState("");

  useEffect(() => {
    setLoading(true);
    // Fetch active issues to identify critical & overdue escalations
    api.get("/issues?limit=250")
      .then(({ data }) => {
        const list = data.issues || [];
        // Filter escalations: Critical priority, high upvotes (>=10), or overdue
        const escalated = list.filter(
          (i) => i.priority === "CRITICAL" || i.isOverdue || (i.upvotes && i.upvotes >= 10)
        );
        escalated.sort((a, b) => {
          if (a.priority === "CRITICAL" && b.priority !== "CRITICAL") return -1;
          if (b.priority === "CRITICAL" && a.priority !== "CRITICAL") return 1;
          return (b.upvotes || 0) - (a.upvotes || 0);
        });
        setIssues(escalated);
      })
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return issues.filter((iss) => {
      const matchSearch =
        !search ||
        iss.title.toLowerCase().includes(search.toLowerCase()) ||
        iss.location.toLowerCase().includes(search.toLowerCase());
      const matchWard = !selectedWard || iss.ward === selectedWard;
      return matchSearch && matchWard;
    });
  }, [issues, search, selectedWard]);

  const wards = Array.from(new Set(issues.map((i) => i.ward).filter(Boolean)));

  return (
    <div className="relative isolate min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
              <ShieldAlert className="h-3.5 w-3.5 animate-pulse" /> High-Priority Escalation Radar
            </div>
            <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
              Civic <span className="text-red-600">Escalation Center</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Active tickets flagged by AI risk models, community upvote spikes, or breached SLA turnaround thresholds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              🚨 {issues.length} Active Escalations
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="glass-panel mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-sm">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search escalated issue or street…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Escalated Wards</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Escalation Cards Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs font-semibold text-slate-400">
            Scanning civic database for escalations…
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center border border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/90">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Zero Active Escalations</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              All high-priority grievances are currently within mandated SLA turnaround limits.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((iss) => (
              <div
                key={iss.id}
                className="glass-panel glass-panel-interactive flex flex-col justify-between overflow-hidden rounded-2xl border border-red-200/80 bg-white/90 shadow-sm dark:border-red-950/60 dark:bg-slate-900/90 hover:shadow-lg transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <CategoryChip category={iss.category} small />
                      <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                        #{iss.id}
                      </span>
                    </div>
                    <PriorityBadge priority={iss.priority} size="sm" />
                  </div>

                  <Link to={`/issues/${iss.id}`}>
                    <h3 className="mt-3 text-sm font-bold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 line-clamp-2">
                      {iss.title}
                    </h3>
                  </Link>

                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {iss.description}
                  </p>

                  <div className="mt-3 rounded-xl border border-red-100 bg-red-50/70 p-2.5 text-xs dark:border-red-900/30 dark:bg-red-950/30">
                    <div className="flex items-center justify-between text-red-700 dark:text-red-300 font-bold text-[11px]">
                      <span>Trigger: {iss.priority === "CRITICAL" ? "Life/Safety Hazard" : "Community Escalated"}</span>
                      <span>👍 {iss.upvotes || 0} Upvotes</span>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <p className="truncate">📍 {iss.location} {iss.ward ? `(${iss.ward})` : ""}</p>
                    <p className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Reported {timeAgo(iss.createdAt)} ({fmtDate(iss.createdAt)})
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
                  <StatusBadge status={iss.status} size="sm" />
                  <Link
                    to={`/issues/${iss.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Action Ticket <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
