import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  Wrench,
  User,
  CheckCircle2,
  XCircle,
  Save,
  AlertCircle,
  Sparkles,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fmtDate, timeAgo } from "../utils.js";

const DEMO_USERS = [
  {
    id: 1,
    name: "Dr. K. Manjunath",
    email: "admin@civicfix.org",
    role: "ADMIN",
    ward: "Ward 1 - Kempegowda",
    trustScore: 99,
    isActive: true,
    createdAt: "2026-01-10T10:00:00Z",
    stats: { reported: 0, assigned: 0, resolved: 0 },
  },
  {
    id: 2,
    name: "Er. Ramesh Narayan",
    email: "pwd.engineer@civicfix.org",
    role: "ENGINEER",
    ward: "Ward 4 - Malleshwaram",
    trustScore: 95,
    isActive: true,
    createdAt: "2026-02-15T11:30:00Z",
    stats: { reported: 0, assigned: 24, resolved: 22 },
  },
  {
    id: 3,
    name: "Er. Sunita Rao",
    email: "lighting.engineer@civicfix.org",
    role: "ENGINEER",
    ward: "Ward 7 - Indiranagar",
    trustScore: 92,
    isActive: true,
    createdAt: "2026-02-18T09:15:00Z",
    stats: { reported: 0, assigned: 16, resolved: 15 },
  },
  {
    id: 4,
    name: "Rohan K.",
    email: "citizen@civicfix.org",
    role: "USER",
    ward: "Ward 7 - Indiranagar",
    trustScore: 92,
    isActive: true,
    createdAt: "2026-03-01T14:20:00Z",
    stats: { reported: 8, assigned: 0, resolved: 7 },
  },
  {
    id: 5,
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    role: "USER",
    ward: "Ward 12 - Koramangala",
    trustScore: 88,
    isActive: true,
    createdAt: "2026-03-05T16:45:00Z",
    stats: { reported: 5, assigned: 0, resolved: 4 },
  },
  {
    id: 6,
    name: "Vikram Malhotra",
    email: "vikram.m@example.com",
    role: "USER",
    ward: "Ward 18 - HSR Layout",
    trustScore: 78,
    isActive: true,
    createdAt: "2026-03-12T08:10:00Z",
    stats: { reported: 3, assigned: 0, resolved: 1 },
  },
];

export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState(DEMO_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/users")
      .then((res) => {
        if (res.data?.users && res.data.users.length > 0) {
          setUsers(res.data.users);
        }
      })
      .catch(() => {
        // Fallback to rich demo roster
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}`, { role: newRole });
      setToast(`User role successfully changed to ${newRole}`);
    } catch {
      setToast(`User role locally simulated as ${newRole}`);
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleActive = (userId) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, isActive: !u.isActive } : u
      )
    );
    setToast("Account access status updated");
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.ward || "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
            <Users className="h-4 w-4" /> Municipal Directory & Identity Access
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            User & Staff Management
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage citizens, field engineers, administrative staff, and permissions.
          </p>
        </div>

        {toast && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {toast}
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="glass-panel mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user by name, email, or ward..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="">All Roles ({users.length})</option>
              <option value="USER">Citizens</option>
              <option value="ENGINEER">Field Engineers</option>
              <option value="ADMIN">Administrators</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="glass-panel overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">User Details</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Ward Jurisdiction</th>
                  <th className="px-5 py-3.5">Trust Score</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((u) => (
                  <tr key={u.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
                          {(u.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={`rounded-xl border px-2.5 py-1 text-xs font-bold outline-none ${
                          u.role === "ADMIN"
                            ? "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                            : u.role === "ENGINEER"
                            ? "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300"
                            : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        }`}
                      >
                        <option value="USER">Citizen</option>
                        <option value="ENGINEER">Field Engineer</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      {u.ward || "City-wide"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${u.trustScore || 85}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                          {u.trustScore || 85}%
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          u.isActive !== false
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {u.isActive !== false ? "Active" : "Suspended"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleToggleActive(u.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                          u.isActive !== false
                            ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        }`}
                      >
                        {u.isActive !== false ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
