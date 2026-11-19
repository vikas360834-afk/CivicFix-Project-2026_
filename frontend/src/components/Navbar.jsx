import { useEffect, useState, useRef, useCallback } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client.js";
import Logo from "./Logo.jsx";
import {
  Map,
  BarChart3,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Wrench,
  PlusCircle,
  LogOut,
  Sun,
  Moon,
  Bell,
  Menu,
  X,
  User as UserIcon,
  Sparkles,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  Info,
  Phone,
  Building2,
  AlertTriangle,
  SearchCheck,
  MessageSquare,
  Users,
} from "lucide-react";

const nlink = ({ isActive }) =>
  `inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
    isActive
      ? "text-blue-600 dark:text-blue-400 bg-blue-500/10 shadow-xs ring-1 ring-blue-500/30"
      : "text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
  }`;

const anchorLink =
  "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60";

/** Sun/Moon theme switch */
function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white/80 text-slate-700 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:text-blue-400 backdrop-blur"
    >
      {dark ? <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 hover:rotate-45" /> : <Moon className="h-4 w-4 text-slate-700 transition-transform duration-300 hover:-rotate-12" />}
    </button>
  );
}

/** Notification Bell Component with 30-60s Polling */
function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const items = [];
      if (user.role === "ADMIN") {
        const { data } = await api.get("/issues/pending");
        if (data.issues && data.issues.length > 0) {
          items.push({
            id: "pending-all",
            title: `${data.issues.length} pending issue${data.issues.length > 1 ? "s" : ""} awaiting approval`,
            time: "Requires admin review",
            link: "/admin",
            type: "admin",
          });
          data.issues.slice(0, 3).forEach((iss) => {
            items.push({
              id: `pending-${iss.id}`,
              title: `#${iss.id}: ${iss.title}`,
              time: `${iss.category} in ${iss.ward || "city"}`,
              link: `/issues/${iss.id}`,
              type: "pending",
            });
          });
        }
      } else if (user.role === "ENGINEER") {
        const { data } = await api.get("/issues/assigned");
        if (data.issues && data.issues.length > 0) {
          const assigned = data.issues.filter((i) => i.status === "ASSIGNED");
          if (assigned.length > 0) {
            items.push({
              id: "assigned-all",
              title: `${assigned.length} new work order${assigned.length > 1 ? "s" : ""} assigned to you`,
              time: "Ready to start",
              link: "/engineer",
              type: "engineer",
            });
          }
          data.issues.slice(0, 3).forEach((iss) => {
            items.push({
              id: `assigned-${iss.id}`,
              title: `#${iss.id}: ${iss.title}`,
              time: `Priority ${iss.priority} · ${iss.status}`,
              link: `/issues/${iss.id}`,
              type: "assigned",
            });
          });
        }
      } else if (user.role === "USER") {
        const { data } = await api.get("/issues/mine");
        if (data.issues && data.issues.length > 0) {
          const updated = data.issues.filter((i) => i.status !== "PENDING_APPROVAL");
          updated.slice(0, 4).forEach((iss) => {
            items.push({
              id: `my-${iss.id}`,
              title: `#${iss.id}: Status is now ${iss.status.replace("_", " ")}`,
              time: iss.title,
              link: `/issues/${iss.id}`,
              type: iss.status.toLowerCase(),
            });
          });
        }
      }

      setNotifications(items);
      setUnreadCount(items.length);
    } catch {
      // Polling network fail safe
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClickItem = (link) => {
    setOpen(false);
    navigate(link);
  };

  const handleClear = () => {
    setUnreadCount(0);
    setNotifications([]);
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="View notifications"
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:text-blue-400 backdrop-blur"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-panel absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Notifications ({unreadCount})
            </span>
            {notifications.length > 0 && (
              <button
                onClick={handleClear}
                className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">No new alerts</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickItem(n.link)}
                  className="w-full rounded-xl p-2.5 text-left transition hover:bg-blue-50/80 dark:hover:bg-slate-800/80 group"
                >
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-400 line-clamp-1">
                    {n.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {n.time}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout, isAdmin, isEngineer, isUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const moreRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("cf-theme", next ? "dark" : "light");
    } catch {}
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  const ctaCls =
    "inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 hover:shadow-blue-500/30";

  const handleAnchorClick = (e, anchorId) => {
    setOpen(false);
    if (location.pathname !== "/") {
      navigate(`/#${anchorId}`);
      return;
    }
    e.preventDefault();
    const el = document.getElementById(anchorId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const moreDropdown = (
    <div className="relative" ref={moreRef}>
      <button
        onClick={() => setMoreOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
      >
        <span>Explore</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`} />
      </button>

      {moreOpen && (
        <div className="glass-panel absolute left-0 top-11 z-50 w-56 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/95">
          <div className="space-y-0.5 text-xs">
            <Link
              to="/track"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-blue-400"
            >
              <SearchCheck className="h-4 w-4 text-blue-500" />
              <span>Track Complaint</span>
            </Link>
            <Link
              to="/departments"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-blue-400"
            >
              <Building2 className="h-4 w-4 text-emerald-500" />
              <span>Departments & SLAs</span>
            </Link>
            <Link
              to="/escalations"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-blue-400"
            >
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <span>Escalation Radar</span>
            </Link>
            <Link
              to="/feedback"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-blue-400"
            >
              <MessageSquare className="h-4 w-4 text-amber-500" />
              <span>Citizen Reviews</span>
            </Link>
            {isAdmin && (
              <>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <Link
                  to="/manage-departments"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40"
                >
                  <Building2 className="h-4 w-4 text-purple-500" />
                  <span>Manage Departments</span>
                </Link>
                <Link
                  to="/manage-users"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40"
                >
                  <Users className="h-4 w-4 text-purple-500" />
                  <span>Manage Users</span>
                </Link>
                <Link
                  to="/admin/auth-analytics"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <ShieldCheck className="h-4 w-4 text-rose-500" />
                  <span>Auth Security Audit</span>
                </Link>
              </>
            )}
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <Link
              to="/about"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80"
            >
              <Info className="h-4 w-4 text-slate-400" />
              <span>About CivicFix</span>
            </Link>
            <Link
              to="/contact"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80"
            >
              <Phone className="h-4 w-4 text-slate-400" />
              <span>Hotlines & Contact</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  // Logged-in nav links
  const loggedInNavLinks = (
    <>
      <NavLink to="/issues" className={nlink} onClick={() => setOpen(false)}>
        <FileText className="h-4 w-4" /> Issues
      </NavLink>
      <NavLink to="/map" className={nlink} onClick={() => setOpen(false)}>
        <Map className="h-4 w-4" /> Live Map
      </NavLink>
      <NavLink to="/analytics" className={nlink} onClick={() => setOpen(false)}>
        <BarChart3 className="h-4 w-4" /> Analytics
      </NavLink>
      <NavLink to="/dashboard" className={nlink} onClick={() => setOpen(false)}>
        <LayoutDashboard className="h-4 w-4" /> Dashboard
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className={nlink} onClick={() => setOpen(false)}>
          <ShieldCheck className="h-4 w-4 text-purple-500" /> Admin Panel
        </NavLink>
      )}
      {isEngineer && (
        <NavLink to="/engineer" className={nlink} onClick={() => setOpen(false)}>
          <Wrench className="h-4 w-4 text-cyan-500" /> Field Work
        </NavLink>
      )}
      {moreDropdown}
    </>
  );

  // Logged-out nav links
  const loggedOutNavLinks = (
    <>
      <Link to="/" className={anchorLink} onClick={(e) => handleAnchorClick(e, "home")}>
        Home
      </Link>
      <NavLink to="/track" className={nlink} onClick={() => setOpen(false)}>
        <SearchCheck className="h-4 w-4" /> Track Complaint
      </NavLink>
      <NavLink to="/departments" className={nlink} onClick={() => setOpen(false)}>
        <Building2 className="h-4 w-4" /> Departments
      </NavLink>
      <NavLink to="/about" className={nlink} onClick={() => setOpen(false)}>
        <Info className="h-4 w-4" /> About
      </NavLink>
      <NavLink to="/contact" className={nlink} onClick={() => setOpen(false)}>
        <Phone className="h-4 w-4" /> Contact
      </NavLink>
    </>
  );

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-200/80 bg-white/90 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90"
          : "border-b border-slate-200/60 bg-white/75 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/75"
      }`}
    >
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600" />
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        {/* Brand Logo */}
        <Link to="/" className="group flex items-center gap-2.5">
          <Logo className="h-8 w-8 drop-shadow-sm transition-transform duration-300 group-hover:scale-110" />
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              Civic<span className="text-blue-600">Fix</span> <span className="text-xs font-semibold uppercase text-sky-500">AI</span>
            </span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wider">
              Smart Civic Works
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {user ? loggedInNavLinks : loggedOutNavLinks}
          <span className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-800" />

          {user && <NotificationBell user={user} />}
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
          <span className="w-1" />

          {user ? (
            <div className="flex items-center gap-2">
              {isUser && (
                <Link to="/report" className={ctaCls} onClick={() => setOpen(false)}>
                  <PlusCircle className="h-3.5 w-3.5" /> Report Issue
                </Link>
              )}
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                onClick={() => setOpen(false)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-xs">
                  {(user.name || "U").charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-xs font-semibold sm:inline max-w-[100px] truncate">
                  {(user.name || "User").split(" ")[0]}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                onClick={() => setOpen(false)}
              >
                Login
              </Link>
              <Link to="/register" className={ctaCls} onClick={() => setOpen(false)}>
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          {user && <NotificationBell user={user} />}
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {open && (
        <div className="border-b border-slate-200 bg-white/95 px-4 pt-2 pb-5 shadow-xl backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
          <div className="flex flex-col gap-1.5">
            {user ? (
              <>
                <div className="mb-2 flex items-center gap-3 rounded-xl bg-blue-50/60 p-2.5 dark:bg-slate-800/60">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-xs">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-[11px] text-slate-500">{user.role} · {user.ward || "City-wide"}</p>
                  </div>
                </div>
                {loggedInNavLinks}
                <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
                {isUser && (
                  <Link to="/report" className={ctaCls} onClick={() => setOpen(false)}>
                    <PlusCircle className="h-4 w-4" /> Report Issue
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
                  onClick={() => setOpen(false)}
                >
                  <UserIcon className="h-4 w-4" /> Profile & Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-red-600 dark:text-red-400"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <>
                {loggedOutNavLinks}
                <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300"
                    onClick={() => setOpen(false)}
                  >
                    Login
                  </Link>
                  <Link to="/register" className={`flex-1 ${ctaCls} justify-center`} onClick={() => setOpen(false)}>
                    Register
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
