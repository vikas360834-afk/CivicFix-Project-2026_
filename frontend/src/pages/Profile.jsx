import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { StatusBadge, PriorityBadge } from "../components/Badges.jsx";
import { fmtDate, timeAgo, apiError, WARDS, CATEGORY_LABELS, CATEGORY_EMOJI } from "../utils.js";

export default function Profile() {
  const { user, setProfile, isAdmin, isEngineer } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", ward: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [myIssues, setMyIssues] = useState(null);
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [userStats, setUserStats] = useState({ points: 0, rank: "Civic Citizen", badges: [] });

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || "", phone: user.phone || "", ward: user.ward || "" });
    }
  }, [user]);

  const loadMyIssues = useCallback(async () => {
    try {
      const { data } = await api.get("/issues/mine");
      const list = data.issues || [];
      setMyIssues(list);

      // Compute points and badges
      const count = list.length;
      const verified = list.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;
      const totalPoints = count * 10 + verified * 25;

      const badges = [];
      if (count >= 1) badges.push({ id: "first", name: "First Responder", emoji: "🌱", desc: "Reported first civic issue" });
      if (count >= 5) badges.push({ id: "scout", name: "Neighborhood Scout", emoji: "🔍", desc: "5+ issues reported" });
      if (verified >= 1) badges.push({ id: "solver", name: "Problem Solver", emoji: "🛡️", desc: "Had an issue verified resolved" });
      if (totalPoints >= 100) badges.push({ id: "champion", name: "City Champion", emoji: "🏆", desc: "100+ civic contribution points" });

      let rank = "Active Citizen";
      if (totalPoints >= 100) rank = "Master City Guardian";
      else if (totalPoints >= 50) rank = "Ward Champion";
      else if (totalPoints >= 20) rank = "Civic Contributor";

      setUserStats({ points: totalPoints, rank, badges });
    } catch (err) {
      setError(apiError(err));
    }
  }, []);

  useEffect(() => {
    if (user) loadMyIssues();
  }, [user, loadMyIssues]);

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);
    try {
      const { data } = await api.put(`/users/${user.id}`, {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        ward: form.ward || null,
      });
      setProfile({ ...user, ...data.user });
      setMessage("Profile updated successfully ✅");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-100">
      {/* Page Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
          Citizen ID #{user.id} · Verified Profile
        </div>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">
          Citizen <span className="grad-text">Profile & Settings</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your contact information, ward association, and track all your civic contributions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Profile Card + Edit Details (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* User Card */}
          <div className="rounded-3xl border border-white/10 bg-[#10182A]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Header banner */}
            <div className="relative isolate overflow-hidden bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 px-6 py-6 text-white">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black text-white backdrop-blur border border-white/30">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xl font-black">{user.name}</p>
                  <p className="truncate text-xs text-blue-100">{user.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-white/30">
                      {user.role}
                    </span>
                    <span className="rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-200 border border-cyan-400/30">
                      {userStats.rank}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contribution Points & Badges */}
            <div className="border-b border-white/10 p-5 bg-slate-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Civic Fix Points</p>
                  <p className="text-2xl font-black text-cyan-400">{userStats.points} PTS</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reports Filed</p>
                  <p className="text-xl font-black text-slate-200">{myIssues?.length || 0}</p>
                </div>
              </div>

              {/* Earned Badges */}
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Earned Badges</p>
                <div className="flex flex-wrap gap-2">
                  {userStats.badges.map((b) => (
                    <span
                      key={b.id}
                      title={b.desc}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-200"
                    >
                      <span>{b.emoji}</span>
                      <span>{b.name}</span>
                    </span>
                  ))}
                  {userStats.badges.length === 0 && (
                    <span className="text-xs text-slate-500 italic">Report issues to unlock achievement badges!</span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="p-6">
              {message && (
                <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs font-semibold text-emerald-300">
                  {message}
                </div>
              )}
              {error && (
                <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs font-semibold text-rose-300">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="pname">
                    Full Name
                  </label>
                  <input
                    id="pname"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="pphone">
                    Phone Number
                  </label>
                  <input
                    id="pphone"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                    placeholder="+91 98xxxxxx"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="pward">
                    Ward Association
                  </label>
                  <select
                    id="pward"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                    value={form.ward}
                    onChange={(e) => setForm({ ...form, ward: e.target.value })}
                  >
                    <option value="" className="bg-[#10182A]">Select your local municipal ward</option>
                    {WARDS.map((w) => (
                      <option key={w} value={w} className="bg-[#10182A]">
                        {w}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-95 disabled:opacity-50"
                >
                  {busy ? "Saving Changes…" : "Save Profile Settings"}
                </button>
              </form>

              <div className="mt-5 rounded-2xl border border-white/5 bg-slate-900/40 p-3.5 text-xs text-slate-400">
                <p>
                  Account Created: <b className="text-slate-200">{fmtDate(user.createdAt)}</b>
                </p>
                {isAdmin && (
                  <Link to="/admin" className="mt-2 inline-block font-bold text-cyan-400 hover:underline">
                    🛡️ Open Admin Command Center →
                  </Link>
                )}
                {isEngineer && (
                  <Link to="/engineer" className="mt-2 inline-block font-bold text-blue-400 hover:underline">
                    🔧 Open Engineer Task Console →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: My Reported Issues (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#10182A]/80 p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">My Reported Issues</h2>
                <p className="text-xs text-slate-400">Track real-time progress and verification of your submissions</p>
              </div>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 border border-blue-500/20">
                {myIssues?.length ?? 0} Report(s)
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {!myIssues && (
                <div className="py-8 text-center text-xs text-slate-400">Loading your reported issues…</div>
              )}

              {myIssues?.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <span className="text-4xl">📝</span>
                  <p className="mt-2 text-sm font-semibold text-slate-300">
                    You haven't reported any civic issues yet.
                  </p>
                  <Link
                    to="/report"
                    className="mt-4 inline-block rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:opacity-95"
                  >
                    Report an Issue Now
                  </Link>
                </div>
              )}

              {myIssues?.map((issue) => {
                const isExpanded = expandedIssue === issue.id;

                return (
                  <div
                    key={issue.id}
                    className="rounded-2xl border border-white/5 bg-slate-900/50 p-4 transition hover:border-white/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-blue-400">#{issue.id}</span>
                          <span className="rounded-lg bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                            {CATEGORY_EMOJI[issue.category]} {CATEGORY_LABELS[issue.category] || issue.category}
                          </span>
                          <PriorityBadge priority={issue.priority} />
                        </div>
                        <h3 className="mt-2 text-sm font-bold text-white">
                          <Link to={`/issues/${issue.id}`} className="hover:text-cyan-400 hover:underline">
                            {issue.title}
                          </Link>
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">📍 {issue.location} {issue.ward ? `· ${issue.ward}` : ""}</p>
                      </div>

                      <StatusBadge status={issue.status} />
                    </div>

                    {/* Rejection alert */}
                    {issue.status === "REJECTED" && (
                      <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-950/30 p-2.5 text-xs text-rose-300">
                        <span className="font-bold">❌ Reason:</span> {issue.rejectionReason || "Report was not approved by administration."}
                      </div>
                    )}

                    {/* Resolution note */}
                    {issue.status === "RESOLVED" && issue.resolutionNote && (
                      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-xs text-emerald-300">
                        <span className="font-bold">✅ Resolution Notes:</span> {issue.resolutionNote}
                      </div>
                    )}

                    {/* Status history dropdown / timeline */}
                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-xs text-slate-400">
                      <span>Reported {timeAgo(issue.createdAt)} · 👍 {issue.upvotes} Upvotes</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                          className="font-semibold text-cyan-400 hover:text-cyan-300"
                        >
                          {isExpanded ? "Hide Audit History ▲" : "Audit History ▼"}
                        </button>
                        <Link to={`/issues/${issue.id}`} className="font-semibold text-blue-400 hover:text-blue-300">
                          Full View →
                        </Link>
                      </div>
                    </div>

                    {/* Collapsible History Timeline */}
                    {isExpanded && issue.statusHistory?.length > 0 && (
                      <div className="mt-3 rounded-xl border border-white/5 bg-slate-950/60 p-3 text-xs space-y-2">
                        <p className="font-bold text-slate-300">Issue Lifecycle Audit Log:</p>
                        {issue.statusHistory.map((h) => (
                          <div key={h.id} className="flex items-start gap-2 text-[11px] text-slate-400">
                            <span className="font-bold text-cyan-400">•</span>
                            <div>
                              <span>
                                <b className="text-slate-200">{h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}</b> on {fmtDate(h.createdAt)}
                              </span>
                              {h.note && <p className="text-slate-400 italic mt-0.5">"{h.note}"</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
