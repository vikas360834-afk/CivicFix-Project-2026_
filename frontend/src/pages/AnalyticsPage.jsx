import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { CATEGORY_LABELS, CATEGORY_EMOJI, WARDS } from "../utils.js";
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

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [wardData, setWardData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activePreset, setActivePreset] = useState("all");

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const mo = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const applyPreset = (preset, days) => {
    setActivePreset(preset);
    if (!days) {
      setFromDate("");
      setToDate("");
      return;
    }
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    setFromDate(from);
    setToDate(to);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedCategory) queryParams.set("category", selectedCategory);
        if (selectedWard) queryParams.set("ward", selectedWard);
        if (fromDate) queryParams.set("from", fromDate);
        if (toDate) queryParams.set("to", toDate);
        const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";

        const [ovRes, catRes, trRes, wkRes, deptRes, wdRes] = await Promise.all([
          api.get(`/stats/overview${qs}`).catch(() => ({ data: {} })),
          api.get(`/stats/category${qs}`).catch(() => ({ data: { categories: [] } })),
          api.get(`/stats/trend${qs}`).catch(() => ({ data: { trend: [] } })),
          api.get(`/stats/weekly${qs}`).catch(() => ({ data: { weekly: [] } })),
          api.get(`/stats/departments${qs}`).catch(() => ({ data: { departments: [] } })),
          api.get(`/stats/ward${qs}`).catch(() => ({ data: { wards: [] } })),
        ]);

        setOverview(ovRes.data || null);

        const cats = (catRes.data.categories || []).map((c) => ({
          ...c,
          rawCategory: c.category,
          name: CATEGORY_LABELS[c.category] || c.category,
        }));
        setCategoryData(cats);

        const tr = (trRes.data.trend || []).map((t) => ({
          ...t,
          label: t.label || t.period,
        }));
        setTrendData(tr);

        setWeeklyData(wkRes.data.weekly || []);
        setDepartmentData(deptRes.data.departments || []);
        setWardData((wdRes.data.wards || []).slice(0, 10));
      } catch (err) {
        console.error("Failed to load analytics data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCategory, selectedWard, fromDate, toDate]);

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
  const legendProps = useMemo(
    () => ({
      wrapperStyle: { fontSize: 11, paddingTop: 8 },
    }),
    []
  );

  const resetFilters = () => {
    setSelectedCategory("");
    setSelectedWard("");
    setFromDate("");
    setToDate("");
    setActivePreset("all");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 text-slate-100">
      {/* Page Title & Hero */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            Live Municipal Transparency Engine
          </div>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            City Analytics & <span className="grad-text">Resolution Graphs</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time interactive analytics powered directly by the municipal SQLite database. Click any chart element to filter issues.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/map"
            className="h-9 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 flex items-center text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:opacity-95"
          >
            🗺️ Open Map Heatmap →
          </Link>
          <Link
            to="/issues"
            className="h-9 rounded-xl border border-white/10 bg-white/5 px-4 flex items-center text-xs font-bold text-slate-200 hover:bg-white/10"
          >
            📋 View Public Feed
          </Link>
        </div>
      </div>

      {/* Interactive Filter Bar: Category, Ward & Date Range */}
      <div className="mb-8 rounded-3xl border border-white/10 bg-[#10182A]/90 p-5 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="text-slate-400 uppercase tracking-wider text-[11px] font-bold">Time Window:</span>
            {[
              { id: "all", label: "All Time", days: null },
              { id: "7d", label: "Last 7 Days", days: 7 },
              { id: "30d", label: "Last 30 Days", days: 30 },
              { id: "90d", label: "Last 90 Days", days: 90 },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id, p.days)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activePreset === p.id
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/30"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {(selectedCategory || selectedWard || fromDate || toDate) && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            >
              ↺ Reset All Filters
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Category Filter</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 rounded-xl border border-white/10 bg-slate-900/60 px-3 text-xs text-slate-200 outline-none backdrop-blur focus:border-blue-500 cursor-pointer"
            >
              <option value="" className="bg-[#10182A]">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#10182A]">
                  {CATEGORY_EMOJI[k]} {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Ward Location</label>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full h-10 rounded-xl border border-white/10 bg-slate-900/60 px-3 text-xs text-slate-200 outline-none backdrop-blur focus:border-blue-500 cursor-pointer"
            >
              <option value="" className="bg-[#10182A]">All Municipal Wards</option>
              {WARDS.map((w) => (
                <option key={w} value={w} className="bg-[#10182A]">
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setActivePreset("custom");
              }}
              className="w-full h-10 rounded-xl border border-white/10 bg-slate-900/60 px-3 text-xs text-slate-200 outline-none backdrop-blur focus:border-blue-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setActivePreset("custom");
              }}
              className="w-full h-10 rounded-xl border border-white/10 bg-slate-900/60 px-3 text-xs text-slate-200 outline-none backdrop-blur focus:border-blue-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-3xl border border-white/10 bg-[#10182A]/80 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Grievances</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 text-lg">📊</span>
          </div>
          <p className="mt-3 text-3xl font-black text-white">{overview?.total ?? 0}</p>
          <p className="mt-1 text-[11px] text-cyan-400 font-medium">Logged across municipal records</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#10182A]/80 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Resolved & Closed</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 text-lg">✅</span>
          </div>
          <p className="mt-3 text-3xl font-black text-emerald-400">
            {((overview?.resolved ?? overview?.byStatus?.RESOLVED ?? 0) + (overview?.closed ?? overview?.byStatus?.CLOSED ?? 0))}
          </p>
          <p className="mt-1 text-[11px] text-emerald-400/80 font-medium">
            {overview?.resolvedRate ?? 0}% overall resolution rate
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#10182A]/80 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Under Repair</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 text-lg">🔧</span>
          </div>
          <p className="mt-3 text-3xl font-black text-cyan-300">
            {((overview?.inProgress ?? overview?.byStatus?.IN_PROGRESS ?? 0) + (overview?.assigned ?? overview?.byStatus?.ASSIGNED ?? 0))}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">Assigned to specialized field engineers</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#10182A]/80 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Triage</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 text-lg">⏳</span>
          </div>
          <p className="mt-3 text-3xl font-black text-amber-400">
            {(overview?.pending ?? overview?.byStatus?.PENDING_APPROVAL ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-amber-400/80 font-medium">Awaiting administrator verification</p>
        </div>
      </div>

      {/* 5 Required Interactive Recharts Graphs */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Graph 1: Category Distribution Pie Chart */}
        <div className="rounded-3xl border border-white/10 bg-[#10182A]/80 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base">1. Issue Category Distribution</h3>
            <span className="rounded-lg bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">Pie Chart (Click to filter)</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">Click any slice to view corresponding reports in the public feed</p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  label={(e) => `${e.count}`}
                  className="cursor-pointer"
                >
                  {categoryData.map((e, idx) => (
                    <Cell
                      key={e.rawCategory || e.category}
                      fill={PALETTE[idx % PALETTE.length]}
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth={2}
                      className="cursor-pointer hover:opacity-80 transition"
                      onClick={() => navigate(`/issues?category=${e.rawCategory || e.category}`)}
                    />
                  ))}
                </Pie>
                <Tooltip {...tooltipProps} />
                <Legend {...legendProps} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Monthly Report Statistics Bar Chart */}
        <div className="rounded-3xl border border-white/10 bg-[#10182A]/80 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base">2. Monthly Report Statistics</h3>
            <span className="rounded-lg bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">Bar Chart</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">Volume of incoming civic complaints logged per month</p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"} />
                <XAxis dataKey="label" tick={axisTick} />
                <YAxis allowDecimals={false} tick={axisTick} />
                <Tooltip {...tooltipProps} />
                <Legend {...legendProps} />
                <Bar
                  dataKey="count"
                  name="Total Reported"
                  fill="#3B82F6"
                  radius={[6, 6, 0, 0]}
                  className="cursor-pointer"
                  onClick={() => navigate("/issues")}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 3: Issue Resolution Trends Line Chart */}
        <div className="rounded-3xl border border-white/10 bg-[#10182A]/80 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base">3. Issue Resolution Trends</h3>
            <span className="rounded-lg bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">Line Chart</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">Direct trajectory comparison: Complaints filed vs officially resolved</p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"} />
                <XAxis dataKey="label" tick={axisTick} />
                <YAxis allowDecimals={false} tick={axisTick} />
                <Tooltip {...tooltipProps} />
                <Legend {...legendProps} />
                <Line type="monotone" dataKey="count" name="Reported" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 4: Weekly Issue Reports Area Chart */}
        <div className="rounded-3xl border border-white/10 bg-[#10182A]/80 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base">4. Weekly Issue Reports (14-Day Flow)</h3>
            <span className="rounded-lg bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/20">Area Chart</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">Daily influx volume of community complaints over the last two weeks</p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"} />
                <XAxis dataKey="label" tick={{ ...axisTick, fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={axisTick} />
                <Tooltip {...tooltipProps} />
                <Legend {...legendProps} />
                <Area type="monotone" dataKey="reported" name="Reported" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 5: Department Performance Horizontal Bar Chart (Full Width) */}
        <div className="rounded-3xl border border-white/10 bg-[#10182A]/80 p-6 backdrop-blur-xl shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base">5. Department Performance & Resolution Rates</h3>
            <span className="rounded-lg bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">Horizontal Bar (Clickable)</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">Click any department to inspect related civic issues in that category</p>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={departmentData} margin={{ left: 30, right: 30, top: 10, bottom: 10 }}>
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
                  onClick={(entry) => {
                    const cat = DEPT_TO_CAT[entry.shortName];
                    if (cat) navigate(`/issues?category=${cat}`);
                    else navigate("/issues");
                  }}
                >
                  {departmentData.map((d) => (
                    <Cell
                      key={d.name}
                      fill={d.resolutionRate > 40 ? "#10B981" : d.resolutionRate > 25 ? "#3B82F6" : "#F59E0B"}
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
  );
}
