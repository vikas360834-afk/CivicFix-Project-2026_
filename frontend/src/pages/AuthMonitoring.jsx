import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  UserX,
  Clock,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  TrendingDown,
  Activity,
  Users,
  LogOut,
  UserPlus,
} from "lucide-react";
import api from "../api/client.js";
import { fmtDate, timeAgo } from "../utils.js";
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

const EVENT_BADGES = {
  LOGIN_SUCCESS: {
    label: "Login Success",
    cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    icon: CheckCircle2,
  },
  LOGIN_FAILED: {
    label: "Login Failed",
    cls: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
    icon: XCircle,
  },
  REGISTER_SUCCESS: {
    label: "New User Registered",
    cls: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30",
    icon: UserPlus,
  },
  LOGOUT: {
    label: "User Logged Out",
    cls: "bg-slate-500/10 text-slate-400 border border-slate-500/30",
    icon: LogOut,
  },
  UNAUTHORIZED_ACCESS: {
    label: "Unauthorized Access",
    cls: "bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse",
    icon: AlertTriangle,
  },
  SESSION_EXPIRED: {
    label: "Session Expired",
    cls: "bg-purple-500/10 text-purple-400 border border-purple-500/30",
    icon: Clock,
  },
};

export default function AuthMonitoring() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/auth-analytics/overview");
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load authentication analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const summary = data?.summary || {
    totalAuthAttempts: 0,
    successRate: 100,
    successfulLogins: 0,
    failedLogins: 0,
    unauthorizedAttempts: 0,
    expiredSessions: 0,
    newRegistrations: 0,
    logouts: 0,
  };

  const pieData = data?.pieData || [];
  const dailyTrends = data?.dailyTrends || [];
  const commonErrors = data?.commonErrors || [];
  const recentLogs = data?.recentLogs || [];

  const filteredLogs = recentLogs.filter((log) => {
    const matchSearch =
      (log.email || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
      (log.failureReason || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
      (log.ipAddress || "").toLowerCase().includes(searchFilter.toLowerCase());
    const matchEvent = eventFilter ? log.eventType === eventFilter : true;
    return matchSearch && matchEvent;
  });

  return (
    <div className="min-h-screen bg-[#070C18] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-400">
              <ShieldAlert className="h-4 w-4" /> Admin Security Center
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Authentication & Security Audit Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Live monitoring of login security, brute-force anomalies, session expiries, and access control audit logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Feed
            </button>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
            >
              ← Admin Command Panel
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-400">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top KPI Cards Grid */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <div className="glass-panel rounded-2xl border border-white/10 bg-[#0E172A]/80 p-4 shadow-xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Attempts</p>
            <p className="mt-1.5 text-2xl font-black text-white">{summary.totalAuthAttempts}</p>
            <span className="text-[10px] font-semibold text-slate-500">Last 14 Days</span>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 bg-[#0E172A]/80 p-4 shadow-xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Success Rate</p>
            <p className="mt-1.5 text-2xl font-black text-emerald-400">{summary.successRate}%</p>
            <span className="text-[10px] font-semibold text-emerald-500/80">{summary.successfulLogins} Passed</span>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 bg-[#0E172A]/80 p-4 shadow-xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Failed Logins</p>
            <p className="mt-1.5 text-2xl font-black text-rose-400">{summary.failedLogins}</p>
            <span className="text-[10px] font-semibold text-rose-500/80">Bad credentials</span>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 bg-[#0E172A]/80 p-4 shadow-xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Unauthorized</p>
            <p className="mt-1.5 text-2xl font-black text-amber-400">{summary.unauthorizedAttempts}</p>
            <span className="text-[10px] font-semibold text-amber-500/80">Role escalation blocks</span>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 bg-[#0E172A]/80 p-4 shadow-xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Expired Sessions</p>
            <p className="mt-1.5 text-2xl font-black text-purple-400">{summary.expiredSessions}</p>
            <span className="text-[10px] font-semibold text-purple-500/80">JWT auto-revoked</span>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 bg-[#0E172A]/80 p-4 shadow-xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">New Citizens</p>
            <p className="mt-1.5 text-2xl font-black text-cyan-400">{summary.newRegistrations}</p>
            <span className="text-[10px] font-semibold text-cyan-500/80">Registrations logged</span>
          </div>
        </div>

        {/* Row 1: Charts (Pie Chart + Daily Bar Chart) */}
        <div className="mb-8 grid gap-6 lg:grid-cols-12">
          {/* Pie Chart: Success vs Failure */}
          <div className="glass-panel rounded-3xl border border-white/10 bg-[#0E172A]/80 p-6 shadow-2xl lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" /> Authentication Breakdown
                </h3>
                <span className="text-[10px] font-semibold text-slate-400">Success vs Error</span>
              </div>

              <div className="mt-4 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => <span className="text-[11px] text-slate-300">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white/5 p-3 text-[11px] text-slate-400 border border-white/5">
              💡 Strict rate limiting is active (10 login attempts per 15 min window) to protect municipal accounts.
            </div>
          </div>

          {/* Bar Chart: Daily Login Activity (Success vs Failed) */}
          <div className="glass-panel rounded-3xl border border-white/10 bg-[#0E172A]/80 p-6 shadow-2xl lg:col-span-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-400" /> Daily Authentication Activity (14 Days)
                </h3>
                <p className="text-[10px] text-slate-400">Successful Logins vs Failed / Rejected Attempts</p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Success
                </span>
                <span className="flex items-center gap-1 font-semibold text-rose-400">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Failed
                </span>
              </div>
            </div>

            <div className="mt-6 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="success" name="Successful" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" name="Failed / Bad Password" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 2: Failed Login Trend Line Chart + Error Breakdown */}
        <div className="mb-8 grid gap-6 lg:grid-cols-12">
          {/* Line Chart: Failed Login Trend */}
          <div className="glass-panel rounded-3xl border border-white/10 bg-[#0E172A]/80 p-6 shadow-2xl lg:col-span-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-rose-400" /> Failed Login Incident Trend
                </h3>
                <p className="text-[10px] text-slate-400">Monitoring spikes in unauthorized attempts</p>
              </div>
              <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-400">
                14-Day Timeline
              </span>
            </div>

            <div className="mt-6 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    name="Failed Attempts"
                    stroke="#EF4444"
                    strokeWidth={2.5}
                    dot={{ fill: "#EF4444", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Most Common Auth Errors */}
          <div className="glass-panel rounded-3xl border border-white/10 bg-[#0E172A]/80 p-6 shadow-2xl lg:col-span-5">
            <div className="border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Most Common Authentication Errors
              </h3>
              <p className="text-[10px] text-slate-400">Frequency distribution of login and access rejections</p>
            </div>

            <div className="mt-4 space-y-3">
              {commonErrors.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">Zero error events recorded in audit log.</p>
              ) : (
                commonErrors.map((err) => (
                  <div key={err.reason} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{err.label}</span>
                      <span className="font-mono font-bold text-rose-400">
                        {err.count} incidents ({err.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500"
                        style={{ width: `${err.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Recent Authentication Event Logs Table */}
        <div className="glass-panel overflow-hidden rounded-3xl border border-white/10 bg-[#0E172A]/80 shadow-2xl">
          <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" /> Recent Security & Authentication Activity
              </h3>
              <p className="text-xs text-slate-400">
                Detailed audit trail (strictly zero password hashes or tokens stored).
              </p>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter email, error, IP..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-900/90 pl-8.5 pr-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="">All Events ({recentLogs.length})</option>
                <option value="LOGIN_SUCCESS">Login Success</option>
                <option value="LOGIN_FAILED">Login Failed</option>
                <option value="UNAUTHORIZED_ACCESS">Unauthorized Access</option>
                <option value="SESSION_EXPIRED">Session Expired</option>
                <option value="REGISTER_SUCCESS">New Registrations</option>
                <option value="LOGOUT">Logouts</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Event Type</th>
                  <th className="px-5 py-3.5">Account / Identifier</th>
                  <th className="px-5 py-3.5">Assigned Role</th>
                  <th className="px-5 py-3.5">Result / Failure Reason</th>
                  <th className="px-5 py-3.5">IP Address</th>
                  <th className="px-5 py-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                      No matching authentication logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const badge = EVENT_BADGES[log.eventType] || {
                      label: log.eventType,
                      cls: "bg-slate-500/10 text-slate-300",
                      icon: Activity,
                    };
                    const IconComp = badge.icon;

                    return (
                      <tr key={log.id} className="transition hover:bg-white/5">
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${badge.cls}`}>
                            <IconComp className="h-3 w-3" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-200">
                          {log.email || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          {log.role ? (
                            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                              {log.role}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {log.failureReason ? (
                            <span className="font-semibold text-rose-400">
                              {log.labelReason || log.failureReason}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">Passed & Authorized</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                          {log.ipAddress || "127.0.0.1"}
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-slate-400 whitespace-nowrap">
                          {fmtDate(log.createdAt)} ({timeAgo(log.createdAt)})
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
