import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import RoleRoute from "./components/RoleRoute.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Issues from "./pages/Issues.jsx";
import IssueDetail from "./pages/IssueDetail.jsx";
import IssueMap from "./pages/IssueMap.jsx";
import MapView from "./pages/MapView.jsx";
import ReportIssue from "./pages/ReportIssue.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import EngineerPanel from "./pages/EngineerPanel.jsx";
import Profile from "./pages/Profile.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Departments from "./pages/Departments.jsx";
import Escalations from "./pages/Escalations.jsx";
import TrackComplaint from "./pages/TrackComplaint.jsx";
import Feedback from "./pages/Feedback.jsx";
import ManageDepartments from "./pages/ManageDepartments.jsx";
import ManageUsers from "./pages/ManageUsers.jsx";
import AuthMonitoring from "./pages/AuthMonitoring.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

  // Authentication loading state — dark glassmorphic spinner
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080D1A] text-cyan-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
          <span className="text-sm font-semibold text-slate-300">Authenticating CivicFix...</span>
        </div>
      </div>
    );
  }

  // BEFORE LOGIN: STRICT LOGIN ONLY — NO NAVBAR, NO MENU, NO FOOTER, NO FEATURES
  if (!user) {
    return (
      <div className="min-h-screen bg-[#080D1A] text-slate-100 flex flex-col justify-center">
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Any URL entered before login automatically redirects to /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  // AFTER LOGIN: Full application unlocked with Navbar, menu items, and role-based features
  const defaultPath =
    user.role === "ADMIN"
      ? "/admin"
      : user.role === "ENGINEER"
      ? "/engineer"
      : "/issues";

  return (
    <div className="flex min-h-screen flex-col bg-[#080D1A] text-slate-100">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1 flex flex-col min-h-0">
        <div key={pathname} className="page-enter flex-1 flex flex-col min-h-0">
          <Routes>
            {/* If logged-in user visits root, login, or register, redirect to their role home */}
            <Route path="/" element={<Navigate to={defaultPath} replace />} />
            <Route path="/login" element={<Navigate to={defaultPath} replace />} />
            <Route path="/register" element={<Navigate to={defaultPath} replace />} />

            {/* Core civic features */}
            <Route path="/map" element={<IssueMap />} />
            <Route path="/map-view" element={<MapView />} />
            <Route path="/issues" element={<Issues />} />
            <Route path="/issues/:id" element={<IssueDetail />} />
            <Route path="/report" element={<ReportIssue />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/escalations" element={<Escalations />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/track" element={<TrackComplaint />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/profile" element={<Profile />} />

            {/* Admin-only features */}
            <Route
              path="/admin"
              element={
                <RoleRoute roles={["ADMIN"]}>
                  <AdminPanel />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/auth-analytics"
              element={
                <RoleRoute roles={["ADMIN"]}>
                  <AuthMonitoring />
                </RoleRoute>
              }
            />
            <Route
              path="/manage-departments"
              element={
                <RoleRoute roles={["ADMIN"]}>
                  <ManageDepartments />
                </RoleRoute>
              }
            />
            <Route
              path="/manage-users"
              element={
                <RoleRoute roles={["ADMIN"]}>
                  <ManageUsers />
                </RoleRoute>
              }
            />

            {/* Engineer-only features */}
            <Route
              path="/engineer"
              element={
                <RoleRoute roles={["ENGINEER"]}>
                  <EngineerPanel />
                </RoleRoute>
              }
            />

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </div>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
