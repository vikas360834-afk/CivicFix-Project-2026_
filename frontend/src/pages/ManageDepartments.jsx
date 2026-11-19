import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Plus,
  Save,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  UserCheck,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import api from "../api/client.js";
import { DEPARTMENT_MAPPING } from "../utils.js";

const DEFAULT_DEPARTMENTS = [
  {
    id: "PWD",
    name: "Public Works Department (Roads)",
    category: "ROAD",
    officerName: "Er. Ramesh Narayan",
    email: "pwd.roads@civicfix.gov.in",
    phone: "080-22975510",
    slaDays: 7,
    activeIssues: 14,
    resolvedRate: "94.2%",
    status: "Active",
  },
  {
    id: "Lighting",
    name: "Electrical & Streetlight Division",
    category: "STREET_LIGHT",
    officerName: "Er. Sunita Rao",
    email: "lighting@civicfix.gov.in",
    phone: "080-22975520",
    slaDays: 3,
    activeIssues: 8,
    resolvedRate: "97.8%",
    status: "Active",
  },
  {
    id: "BWSSB",
    name: "Water Supply & Sewerage Board (BWSSB)",
    category: "WATER",
    officerName: "Er. V. Venkatesh",
    email: "bwssb.ops@civicfix.gov.in",
    phone: "080-22238888",
    slaDays: 4,
    activeIssues: 19,
    resolvedRate: "91.5%",
    status: "Active",
  },
  {
    id: "Sanitation",
    name: "Sanitation & Solid Waste Management",
    category: "SANITATION",
    officerName: "Dr. K. Manjunath",
    email: "swm.sanitation@civicfix.gov.in",
    phone: "080-22975540",
    slaDays: 2,
    activeIssues: 11,
    resolvedRate: "98.1%",
    status: "Active",
  },
  {
    id: "Drainage",
    name: "Stormwater & Drainage Division",
    category: "DRAINAGE",
    officerName: "Er. Deepa Nair",
    email: "drainage@civicfix.gov.in",
    phone: "080-22975550",
    slaDays: 5,
    activeIssues: 6,
    resolvedRate: "89.4%",
    status: "Active",
  },
  {
    id: "BESCOM",
    name: "Electricity Board (BESCOM)",
    category: "ELECTRICITY",
    officerName: "Er. M. S. Prasad",
    email: "bescom.civic@civicfix.gov.in",
    phone: "1912",
    slaDays: 2,
    activeIssues: 5,
    resolvedRate: "96.5%",
    status: "Active",
  },
];

export default function ManageDepartments() {
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [toast, setToast] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDept, setNewDept] = useState({
    name: "",
    category: "OTHER",
    officerName: "",
    email: "",
    phone: "",
    slaDays: 5,
  });

  useEffect(() => {
    // Optionally fetch dynamic department stats from API
    api
      .get("/stats/departments")
      .then((res) => {
        if (res.data?.departments && Array.isArray(res.data.departments)) {
          // Merge active counts if available
          setDepartments((prev) =>
            prev.map((d) => {
              const found = res.data.departments.find(
                (item) => item.department === d.id || item.name === d.name
              );
              if (found) {
                return {
                  ...d,
                  activeIssues: found.active || d.activeIssues,
                  resolvedRate: found.resolvedRate || d.resolvedRate,
                };
              }
              return d;
            })
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleEdit = (dept) => {
    setEditingId(dept.id);
    setEditForm({ ...dept });
  };

  const handleSave = (id) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...editForm } : d))
    );
    setEditingId(null);
    setToast("Department settings updated successfully!");
    setTimeout(() => setToast(null), 3500);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newDept.name || !newDept.officerName) return;

    const created = {
      ...newDept,
      id: newDept.name.replace(/[^a-zA-Z]/g, "").slice(0, 8).toUpperCase(),
      activeIssues: 0,
      resolvedRate: "100%",
      status: "Active",
    };

    setDepartments([created, ...departments]);
    setShowAddModal(false);
    setNewDept({ name: "", category: "OTHER", officerName: "", email: "", phone: "", slaDays: 5 });
    setToast("New department registered to municipal roster!");
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.officerName.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">
              <Building2 className="h-3.5 w-3.5" /> Department Administration
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Manage Municipal Departments
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Configure department contacts, nodal officers, service level agreements (SLAs), and monitoring.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Department
          </button>
        </div>

        {toast && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {toast}
          </div>
        )}

        {/* Search Bar */}
        <div className="glass-panel mb-6 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search department by name, officer, or jurisdiction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs font-semibold text-slate-900 outline-none dark:text-white"
          />
        </div>

        {/* Departments Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((dept) => {
            const isEditing = editingId === dept.id;

            return (
              <div
                key={dept.id}
                className="glass-panel flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {dept.id}
                      </span>
                      <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                        {dept.name}
                      </h3>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                      {dept.status}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="mt-4 space-y-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Nodal Officer</label>
                        <input
                          type="text"
                          value={editForm.officerName || ""}
                          onChange={(e) => setEditForm({ ...editForm, officerName: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Contact Email</label>
                        <input
                          type="email"
                          value={editForm.email || ""}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Hotline Phone</label>
                        <input
                          type="text"
                          value={editForm.phone || ""}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">SLA Target (Days)</label>
                        <input
                          type="number"
                          value={editForm.slaDays || 3}
                          onChange={(e) => setEditForm({ ...editForm, slaDays: Number(e.target.value) })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{dept.officerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{dept.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{dept.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span>SLA Resolution: <strong className="text-slate-900 dark:text-white">{dept.slaDays} days</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Stats Strip */}
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-center dark:border-slate-800">
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/50">
                      <p className="text-[10px] font-semibold text-slate-400">Active Work</p>
                      <p className="text-xs font-extrabold text-blue-600 dark:text-blue-400">{dept.activeIssues} Issues</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/50">
                      <p className="text-[10px] font-semibold text-slate-400">Resolution Rate</p>
                      <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{dept.resolvedRate}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(dept.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                      >
                        <Save className="h-3.5 w-3.5" /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleEdit(dept)}
                        className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Edit Details
                      </button>
                      <Link
                        to={`/issues?department=${encodeURIComponent(dept.id)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400"
                      >
                        View Orders <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="glass-panel w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Register New Municipal Department
              </h3>
              <form onSubmit={handleCreate} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Department Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Traffic Engineering Cell"
                    value={newDept.name}
                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nodal Officer</label>
                  <input
                    type="text"
                    placeholder="e.g. Er. Ankit Verma"
                    value={newDept.officerName}
                    onChange={(e) => setNewDept({ ...newDept, officerName: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Official Email</label>
                    <input
                      type="email"
                      placeholder="dept@civicfix.gov.in"
                      value={newDept.email}
                      onChange={(e) => setNewDept({ ...newDept, email: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Hotline</label>
                    <input
                      type="text"
                      placeholder="080-2297xxxx"
                      value={newDept.phone}
                      onChange={(e) => setNewDept({ ...newDept, phone: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">SLA Max Days</label>
                  <input
                    type="number"
                    value={newDept.slaDays}
                    onChange={(e) => setNewDept({ ...newDept, slaDays: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    min={1}
                    max={30}
                    required
                  />
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700"
                  >
                    Register Department
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
