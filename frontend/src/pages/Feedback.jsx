import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  MessageSquare,
  ThumbsUp,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Send,
  AlertCircle,
  Building2,
  Calendar,
  User,
} from "lucide-react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fmtDate, timeAgo } from "../utils.js";

const DEMO_FEEDBACKS = [
  {
    id: "fb-1",
    issueId: 102,
    issueTitle: "Hazardous pothole repair on MG Road",
    department: "Public Works Department (Roads)",
    citizenName: "Rohan K.",
    rating: 5,
    comment: "The repair was completed within 24 hours of being assigned. High quality asphalt patch with safety cones during work. Great job CivicFix!",
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    trustScore: 92,
  },
  {
    id: "fb-2",
    issueId: 105,
    issueTitle: "Faulty street light blinking on 12th Cross",
    department: "Electrical & Streetlight Division",
    citizenName: "Priya Sharma",
    rating: 5,
    comment: "Technician replaced the LED fixture with photo proof uploaded. Very transparent and responsive system.",
    createdAt: new Date(Date.now() - 3600000 * 42).toISOString(),
    trustScore: 88,
  },
  {
    id: "fb-3",
    issueId: 108,
    issueTitle: "Overflowing garbage dump near community park",
    department: "Sanitation & Solid Waste Management",
    citizenName: "Anand M.",
    rating: 4,
    comment: "Waste was fully cleared and area sanitized. Slight delay on the initial verification, but the field team did solid work.",
    createdAt: new Date(Date.now() - 3600000 * 70).toISOString(),
    trustScore: 85,
  },
  {
    id: "fb-4",
    issueId: 111,
    issueTitle: "Broken water main valve leaking potable water",
    department: "Water Supply & Sewerage Board (BWSSB)",
    citizenName: "Sanjay Hegde",
    rating: 5,
    comment: "BWSSB emergency squad dispatched promptly. Water wastage stopped and pipeline reinforced. Commendable efficiency!",
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    trustScore: 95,
  },
];

export default function Feedback() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState(DEMO_FEEDBACKS);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [issueId, setIssueId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolvedIssues, setResolvedIssues] = useState([]);

  useEffect(() => {
    // Attempt to load resolved issues for logged-in user
    if (user) {
      api
        .get("/issues/mine")
        .then((res) => {
          const resolved = (res.data.issues || []).filter(
            (i) => i.status === "RESOLVED" || i.status === "CLOSED"
          );
          setResolvedIssues(resolved);
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setLoading(true);
    setTimeout(() => {
      const newFb = {
        id: `fb-${Date.now()}`,
        issueId: issueId ? Number(issueId) : 115,
        issueTitle: issueId ? `Complaint #${issueId}` : "Civic Resolution Service",
        department: "Municipal Civic Administration",
        citizenName: user?.name || "Verified Citizen",
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        trustScore: 85,
      };

      setFeedbacks([newFb, ...feedbacks]);
      setComment("");
      setSubmitted(true);
      setLoading(false);
      setTimeout(() => setSubmitted(false), 4000);
    }, 500);
  };

  const avgRating = (
    feedbacks.reduce((acc, f) => acc + f.rating, 0) / (feedbacks.length || 1)
  ).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-4 w-4" /> Citizen Trust & Quality Assurance
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Citizen Feedback & Reviews
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Transparent evaluations on municipal works resolution quality and field team accountability.
          </p>
        </div>

        {/* Stats Row */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="glass-panel flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Star className="h-6 w-6 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{avgRating} / 5.0</p>
              <p className="text-xs font-semibold text-slate-500">Average Citizen Rating</p>
            </div>
          </div>

          <div className="glass-panel flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{feedbacks.length} Verified</p>
              <p className="text-xs font-semibold text-slate-500">Total Reviews Logged</p>
            </div>
          </div>

          <div className="glass-panel flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">96.4%</p>
              <p className="text-xs font-semibold text-slate-500">Satisfaction Rate</p>
            </div>
          </div>
        </div>

        {/* Feedback Form Card */}
        <div className="glass-panel mb-10 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:p-8">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Submit Resolution Feedback
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Share your satisfaction on how your civic complaint was resolved.
            </p>
          </div>

          {submitted && (
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              Thank you! Your feedback has been verified and recorded to the municipal quality registry.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Star Rating Picker */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Your Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        (hoverRating || rating) >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300 dark:text-slate-700"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {rating === 5 ? "Exceptional" : rating === 4 ? "Good" : rating === 3 ? "Average" : "Needs Improvement"}
                </span>
              </div>
            </div>

            {/* Resolved Issue Picker */}
            {resolvedIssues.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Resolved Issue (Optional)
                </label>
                <select
                  value={issueId}
                  onChange={(e) => setIssueId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 shadow-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Select one of your resolved issues...</option>
                  {resolvedIssues.map((iss) => (
                    <option key={iss.id} value={iss.id}>
                      #{iss.id} - {iss.title} ({fmtDate(iss.createdAt)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Comment */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Detailed Review & Comments
              </label>
              <textarea
                rows={3}
                placeholder="Describe the speed, quality, and cleanliness of the repair work..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs text-slate-900 shadow-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> {loading ? "Recording..." : "Post Review"}
            </button>
          </form>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Recent Citizen Evaluations ({feedbacks.length})
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {feedbacks.map((item) => (
              <div
                key={item.id}
                className="glass-panel flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < item.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300 dark:text-slate-700"
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {item.rating}.0
                      </span>
                    </div>
                    <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      #{item.issueId}
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-900 dark:text-white">
                    {item.issueTitle}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                    &ldquo;{item.comment}&rdquo;
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {item.citizenName} · Trust {item.trustScore}%
                  </span>
                  <span>{timeAgo(item.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
