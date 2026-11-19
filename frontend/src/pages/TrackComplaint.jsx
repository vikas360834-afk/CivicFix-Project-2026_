import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  AlertCircle,
  FileText,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  KeyRound,
  Eye,
  Camera,
} from "lucide-react";
import api from "../api/client.js";
import {
  STATUS_META,
  CATEGORY_LABELS,
  CATEGORY_EMOJI,
  fmtDate,
  timeAgo,
  issuePhoto,
} from "../utils.js";
import { StatusBadge, PriorityBadge } from "../components/Badges.jsx";

const TIMELINE_STEPS = [
  { key: "PENDING_APPROVAL", label: "Submitted", desc: "Report filed by citizen & logged in queue" },
  { key: "OPEN", label: "Verified", desc: "Reviewed and validated by civic administration" },
  { key: "ASSIGNED", label: "Assigned", desc: "Dispatched to responsible municipal department" },
  { key: "IN_PROGRESS", label: "In Progress", desc: "Field engineer deployed & repair work underway" },
  { key: "RESOLVED", label: "Resolved", desc: "Repairs verified with completion photographic proof" },
];

const STEP_ORDER = {
  PENDING_APPROVAL: 0,
  OPEN: 1,
  ASSIGNED: 2,
  IN_PROGRESS: 3,
  RESOLVED: 4,
  CLOSED: 4,
  REJECTED: -1,
  ESCALATED: 3,
};

export default function TrackComplaint() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("id") || "";

  const [complaintId, setComplaintId] = useState(initialId);
  const [email, setEmail] = useState("");
  const [otpMode, setOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [issue, setIssue] = useState(null);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const cleanId = complaintId.toString().replace(/[^0-9]/g, "");
    if (!cleanId) {
      setError("Please enter a valid numeric complaint ID (e.g. 101 or #101)");
      return;
    }

    setLoading(true);
    setError("");
    setIssue(null);

    try {
      // Fetch issue from API
      const { data } = await api.get(`/issues/${cleanId}`);
      if (data && (data.issue || data.id)) {
        setIssue(data.issue || data);
      } else {
        setError(`Complaint #${cleanId} not found. Please verify the ID.`);
      }
    } catch (err) {
      // If unauthorized or not found, try searching issues feed
      try {
        const feedRes = await api.get(`/issues?limit=50`);
        const found = (feedRes.data.issues || []).find((i) => String(i.id) === String(cleanId));
        if (found) {
          setIssue(found);
        } else {
          setError(err?.response?.data?.error || `Complaint #${cleanId} was not found.`);
        }
      } catch {
        setError(err?.response?.data?.error || `Complaint #${cleanId} not found in civic registry.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!email || !complaintId) {
      setError("Please provide both Complaint ID and registered Email.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
    }, 600);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (enteredOtp !== "429180" && enteredOtp.length !== 6) {
      setError("Invalid OTP code. Please use demo code 429180.");
      return;
    }
    setError("");
    setOtpMode(false);
    handleSearch();
  };

  const currentStepIdx = issue ? STEP_ORDER[issue.status] ?? 0 : 0;
  const isRejected = issue?.status === "REJECTED";
  const photo = issue ? issuePhoto(issue) : null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
            <ShieldCheck className="h-4 w-4" /> Official Municipal Tracking System
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Track Civic Complaint
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Enter your Complaint ID to view live progress, assigned department, and resolution timeline.
          </p>
        </div>

        {/* Search Card */}
        <div className="glass-panel mb-8 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {otpMode ? "Secure OTP Verification" : "Complaint Lookup"}
              </h2>
            </div>
            <button
              onClick={() => {
                setOtpMode(!otpMode);
                setError("");
              }}
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              {otpMode ? "← Quick ID Search" : "Use OTP Tracking 🔒"}
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!otpMode ? (
            <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Complaint ID (e.g. 1, 102, #45)"
                  value={complaintId}
                  onChange={(e) => setComplaintId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm font-semibold text-slate-900 shadow-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Searching..." : "Track Status"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : !otpSent ? (
            <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Complaint ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 101"
                    value={complaintId}
                    onChange={(e) => setComplaintId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    placeholder="citizen@civicfix.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
              >
                <KeyRound className="h-4 w-4" /> {loading ? "Dispatching OTP..." : "Send Verification OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                OTP sent to <strong>{email}</strong>. For demonstration, use code: <strong className="underline">429180</strong>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="429180"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-center text-lg font-mono tracking-widest text-slate-900 shadow-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  required
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Verify & Show Complaint
              </button>
            </form>
          )}
        </div>

        {/* Complaint Result */}
        {issue && (
          <div className="space-y-6">
            {/* Summary Banner */}
            <div className="glass-panel rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-xl bg-blue-600/10 px-3 py-1 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      #{issue.id}
                    </span>
                    <StatusBadge status={issue.status} />
                    <PriorityBadge priority={issue.priority || "MEDIUM"} />
                    <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {CATEGORY_EMOJI[issue.category] || "📍"} {CATEGORY_LABELS[issue.category] || issue.category}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                    {issue.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {issue.description}
                  </p>
                </div>
                {photo && (
                  <img
                    src={photo}
                    alt={issue.title}
                    className="h-28 w-28 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-800 sm:h-32 sm:w-32"
                  />
                )}
              </div>

              {/* Quick Meta */}
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Location</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {issue.location || "City Area"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Ward</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {issue.ward || "Ward 1"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Submitted On</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {fmtDate(issue.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Department</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {issue.aiDepartment || issue.department || "Municipal Works"}
                  </p>
                </div>
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div className="glass-panel rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:p-8">
              <h3 className="mb-6 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Clock className="h-5 w-5 text-blue-600" /> Resolution Lifecycle Timeline
              </h3>

              {isRejected ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-700 dark:text-rose-300">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertCircle className="h-5 w-5 text-rose-600" /> Complaint Rejected by Administration
                  </div>
                  <p className="mt-2 text-xs text-rose-600/90 dark:text-rose-300/90">
                    Reason: {issue.rejectionReason || "Does not meet municipal jurisdiction criteria or lacks required proof."}
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {TIMELINE_STEPS.map((step, idx) => {
                    const isDone = currentStepIdx >= idx;
                    const isCurrent = currentStepIdx === idx;
                    return (
                      <div key={step.key} className="relative pb-6 last:pb-0">
                        {/* Dot */}
                        <div
                          className={`absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                            isDone
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="ml-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold ${
                                isDone
                                  ? "text-slate-900 dark:text-white"
                                  : "text-slate-400 dark:text-slate-600"
                              }`}
                            >
                              {step.label}
                            </span>
                            {isCurrent && (
                              <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 animate-pulse">
                                CURRENT STATUS
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <Link
                  to={`/issues/${issue.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                >
                  <Eye className="h-4 w-4" /> View Full Complaint Details & Photos →
                </Link>
                <Link
                  to={`/map?lat=${issue.latitude}&lng=${issue.longitude}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-300"
                >
                  <MapPin className="h-4 w-4" /> Locate on Live Map ↗
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
