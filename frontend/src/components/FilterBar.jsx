import { CATEGORY_LABELS, STATUS_META, WARDS, DEPARTMENT_MAPPING } from "../utils.js";
import { Filter, RotateCcw, Calendar, Search, Building2, MapPin, AlertCircle } from "lucide-react";

const DEFAULT_FEED_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"];

export default function FilterBar({
  filters,
  onChange,
  onReset,
  showDate = true,
  allowedStatuses = DEFAULT_FEED_STATUSES,
  showSearch = true,
}) {
  const set = (key, value) => onChange({ ...filters, [key]: value || "", page: 1 });

  const selectCls =
    "w-full rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100";

  const statusOptions = Object.entries(STATUS_META).filter(
    ([k]) => !allowedStatuses || allowedStatuses.includes(k)
  );

  const departments = Array.from(new Set(Object.values(DEPARTMENT_MAPPING)));

  const hasActiveFilters =
    Boolean(filters.category || filters.status || filters.priority || filters.ward || filters.q || filters.from || filters.to || filters.department);

  return (
    <div className="glass-panel sticky top-[73px] z-30 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
      <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search keyword..."
              className={`${selectCls} pl-8.5`}
              value={filters.q || ""}
              onChange={(e) => set("q", e.target.value)}
            />
          </div>
        )}

        {/* Category */}
        <select
          aria-label="Filter by category"
          className={selectCls}
          value={filters.category || ""}
          onChange={(e) => set("category", e.target.value)}
        >
          <option value="">🗂️ All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          aria-label="Filter by status"
          className={selectCls}
          value={filters.status || ""}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="">🔄 All Statuses</option>
          {statusOptions.map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        {/* Priority */}
        <select
          aria-label="Filter by priority"
          className={selectCls}
          value={filters.priority || ""}
          onChange={(e) => set("priority", e.target.value)}
        >
          <option value="">🔥 All Priorities</option>
          <option value="CRITICAL">🚨 Critical</option>
          <option value="HIGH">🟠 High</option>
          <option value="MEDIUM">🔵 Medium</option>
          <option value="LOW">⚪ Low</option>
        </select>

        {/* Ward */}
        <select
          aria-label="Filter by ward"
          className={selectCls}
          value={filters.ward || ""}
          onChange={(e) => set("ward", e.target.value)}
        >
          <option value="">📍 All Wards</option>
          {WARDS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>

        {/* Department / Reset Actions */}
        <div className="flex items-center gap-1.5">
          {showDate ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="date"
                title="From Date"
                className={`${selectCls} px-1.5 py-1.5 text-[11px]`}
                value={filters.from || ""}
                onChange={(e) => set("from", e.target.value)}
              />
              <input
                type="date"
                title="To Date"
                className={`${selectCls} px-1.5 py-1.5 text-[11px]`}
                value={filters.to || ""}
                onChange={(e) => set("to", e.target.value)}
              />
            </div>
          ) : (
            <select
              aria-label="Filter by department"
              className={selectCls}
              value={filters.department || ""}
              onChange={(e) => set("department", e.target.value)}
            >
              <option value="">🏛️ All Depts</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
