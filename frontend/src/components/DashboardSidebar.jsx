import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Wrench,
  Sparkles,
  Building2,
  Layers,
  History,
  Award,
  Flame,
  PlusCircle
} from "lucide-react";

export default function DashboardSidebar({
  role = "USER",
  activeTab,
  onTabChange,
  counts = {},
}) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const citizenTabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "my-reports", label: "My Complaints", icon: FileText, badge: counts.mine },
    { id: "nearby", label: "Nearby Issues", icon: MapPin, badge: counts.nearby },
    { id: "analytics", label: "Community Analytics", icon: BarChart3 },
    { id: "activity", label: "Live Activity", icon: History },
    { id: "leaderboard", label: "Civic Karma", icon: Award },
  ];

  const adminTabs = [
    { id: "pending", label: "Pending Approvals", icon: Clock, badge: counts.pending, alert: counts.pending > 0 },
    { id: "active", label: "Active Grievances", icon: FileText, badge: counts.active },
    { id: "analytics", label: "City Analytics", icon: BarChart3 },
    { id: "departments", label: "Departments", icon: Building2 },
    { id: "assignments", label: "Engineer Dispatch", icon: Wrench },
    { id: "users", label: "Citizen Directory", icon: Users },
    { id: "logs", label: "Audit Logs", icon: History },
    { id: "archive", label: "Resolved Archive", icon: CheckCircle2 },
  ];

  const engineerTabs = [
    { id: "all", label: "All Assigned", icon: FileText, badge: counts.total },
    { id: "assigned", label: "New Work Orders", icon: Clock, badge: counts.assigned, alert: counts.assigned > 0 },
    { id: "in_progress", label: "In Progress", icon: Wrench, badge: counts.inProgress },
    { id: "completed", label: "Resolved Work", icon: CheckCircle2, badge: counts.resolved },
    { id: "overdue", label: "SLA Escalations", icon: AlertTriangle, badge: counts.overdue, alert: counts.overdue > 0 },
  ];

  const tabs =
    role === "ADMIN"
      ? adminTabs
      : role === "ENGINEER"
      ? engineerTabs
      : citizenTabs;

  return (
    <aside
      className={`glass-panel hidden lg:flex flex-col border-r border-slate-200/80 bg-white/90 transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/90 rounded-2xl p-3 shrink-0 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {role === "ADMIN" ? "Admin Ops" : role === "ENGINEER" ? "Field Hub" : "Citizen Portal"}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 custom-scrollbar overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"
              } ${collapsed ? "justify-center px-2" : ""}`}
              title={collapsed ? tab.label : undefined}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : ""}`} />
              {!collapsed && <span className="flex-1 text-left truncate">{tab.label}</span>}

              {!collapsed && tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : tab.alert
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Action Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
        {role === "USER" && !collapsed && (
          <Link
            to="/report"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Submit Complaint</span>
          </Link>
        )}
        <Link
          to="/map"
          className={`flex items-center gap-2 rounded-xl p-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition ${
            collapsed ? "justify-center" : ""
          }`}
          title="Interactive Map"
        >
          <MapPin className="h-4 w-4 text-sky-500" />
          {!collapsed && <span>Open Live Map</span>}
        </Link>
      </div>
    </aside>
  );
}
