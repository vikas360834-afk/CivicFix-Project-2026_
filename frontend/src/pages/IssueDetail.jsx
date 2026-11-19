import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { StatusBadge, PriorityBadge, CategoryChip } from "../components/Badges.jsx";
import { fmtDate, timeAgo, apiError, STATUS_META, CATEGORY_LABELS, CATEGORY_EMOJI, issuePhoto } from "../utils.js";

const TIMELINE_STEPS = [
  { key: "PENDING_APPROVAL", label: "Reported", desc: "Logged by Citizen" },
  { key: "OPEN", label: "Approved", desc: "Admin Triage" },
  { key: "ASSIGNED", label: "Assigned", desc: "Engineer Dispatched" },
  { key: "IN_PROGRESS", label: "In Progress", desc: "Repairs Underway" },
  { key: "RESOLVED", label: "Resolved", desc: "Proof Uploaded" },
  { key: "CLOSED", label: "Verified", desc: "Citizen Sign-off" },
];

function getTimelineIndex(status) {
  if (status === "REJECTED") return -1;
  const map = {
    PENDING_APPROVAL: 0,
    OPEN: 1,
    ASSIGNED: 2,
    IN_PROGRESS: 3,
    RESOLVED: 4,
    CLOSED: 5,
  };
  return map[status] ?? 0;
}

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isEngineer } = useAuth();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [busy, setBusy] = useState(false);
  const [voted, setVoted] = useState(false);

  // Modals / Panels
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [resolvePhoto, setResolvePhoto] = useState(null);
  const resolvePhotoUrl = useRef(null);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState("");

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [engineers, setEngineers] = useState([]);
  const [selectedEng, setSelectedEng] = useState("");
  const [assignNote, setAssignNote] = useState("");

  useEffect(() => () => {
    if (resolvePhotoUrl.current) URL.revokeObjectURL(resolvePhotoUrl.current);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/issues/${id}`);
      setIssue(data.issue);
      setVoted(false);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Load engineers for admin assign modal
  useEffect(() => {
    if (isAdmin) {
      api.get("/users?role=ENGINEER").then(({ data }) => {
        setEngineers(data.users || []);
      }).catch(() => {});
    }
  }, [isAdmin]);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return setCommentError("Comment cannot be empty");
    setCommentError("");
    setBusy(true);
    try {
      await api.post(`/issues/${id}/comments`, { body: comment.trim() });
      setComment("");
      await load();
    } catch (err) {
      setCommentError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const upvote = async () => {
    try {
      const { data } = await api.post(`/issues/${id}/upvote`);
      setIssue((prev) => ({ ...prev, upvotes: data.upvotes }));
      setVoted(data.upvoted);
    } catch (err) {
      setCommentError(apiError(err));
    }
  };

  /* Status transitions */
  const handleApprove = async () => {
    setBusy(true);
    try {
      await api.patch(`/issues/${id}/approve`);
      await load();
    } catch (err) {
      setCommentError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return setCommentError("Rejection reason is required");
    setBusy(true);
    try {
      await api.patch(`/issues/${id}/reject`, { reason: rejectReason.trim() });
      setRejectOpen(false);
      setRejectReason("");
      await load();
    } catch (err) {
      setCommentError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedEng) return setCommentError("Please select an engineer");
    setBusy(true);
    try {
      await api.patch(`/issues/${id}/assign`, {
        engineerId: selectedEng,
        note: assignNote.trim() || undefined,
      });
      setAssignOpen(false);
      setSelectedEng("");
      setAssignNote("");
      await load();
    } catch (err) {
      setCommentError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleStartWork = async () => {
    setBusy(true);
    try {
      await api.patch(`/issues/${id}/status`, { status: "IN_PROGRESS" });
      await load();
    } catch (err) {
      setCommentError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmResolve = async () => {
    if (!resolveNote.trim()) {
      setCommentError("Resolution note is required");
      return;
    }
    setBusy(true);
    setCommentError("");
    try {
      await api.patch(`/issues/${id}/status`, {
        status: "RESOLVED",
        note: resolveNote.trim(),
      });
      if (resolvePhoto) {
        const fd = new FormData();
        fd.append("images", resolvePhoto.file, resolvePhoto.file.name);
        await api.post(`/issues/${id}/images`, fd);
      }
      setResolveOpen(false);
      setResolveNote("");
      if (resolvePhotoUrl.current) URL.revokeObjectURL(resolvePhotoUrl.current);
      resolvePhotoUrl.current = null;
      setResolvePhoto(null);
      await load();
    } catch (err) {
      setCommentError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  // Citizen or Admin verification of completed resolution
  const handleVerify = async () => {
    setBusy(true);
    try {
      await api.patch(`/issues/${id}/verify`, { feedback: verifyFeedback });
      setVerifyOpen(false);
      setVerifyFeedback("");
      await load();
    } catch (err) {
      setCommentError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const onPickResolvePhoto = (fileList) => {
    const file = fileList[0];
    if (!file) return;
    if (resolvePhotoUrl.current) URL.revokeObjectURL(resolvePhotoUrl.current);
    const url = URL.createObjectURL(file);
    resolvePhotoUrl.current = url;
    setResolvePhoto({ url, file });
  };

  const addImage = async (fileList) => {
    const files = Array.from(fileList).slice(0, 5);
    if (files.length === 0) return;
    setBusy(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f, f.name));
      await api.post(`/issues/${id}/images`, fd);
      await load();
    } catch (err) {
      setCommentError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteImage = async (imageId) => {
    if (!window.confirm("Remove this photo?")) return;
    try {
      await api.delete(`/issues/${id}/images/${imageId}`);
      await load();
    } catch (err) {
      setCommentError(apiError(err));
    }
  };

  const removeIssue = async () => {
    if (!window.confirm("Delete this issue permanently?")) return;
    try {
      await api.delete(`/issues/${id}`);
      navigate("/issues");
    } catch (err) {
      setCommentError(apiError(err));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <span className="text-5xl">🔍</span>
        <p className="mt-3 font-bold text-white text-lg">{error || "Issue not found."}</p>
        <Link to="/issues" className="mt-4 btn btn-primary text-xs inline-flex">
          ← Back to issues feed
        </Link>
      </div>
    );
  }

  const canDelete = user && (user.id === issue.user?.id || user.role === "ADMIN");
  const isReporter = user && issue.user?.id === user.id;
  const isAssignedEngineer = user && issue.assignedToId === user.id;
  const images = issue.images ?? [];
  const statusHistory = issue.statusHistory || [];
  const stepIdx = getTimelineIndex(issue.status);

  return (
    <div className="relative isolate min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center justify-between text-xs">
          <Link to="/issues" className="font-bold text-blue-400 hover:underline flex items-center gap-1">
            <span>←</span> Back to issues feed
          </Link>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-mono text-blue-400 font-bold">#{issue.id}</span>
            <span>•</span>
            <span>{timeAgo(issue.createdAt)}</span>
          </div>
        </div>

        {/* ========================================================
            1. 7-STAGE LIFECYCLE PROGRESSION TIMELINE
            ======================================================== */}
        <div className="mb-6 rounded-3xl border border-white/10 bg-[#10182A]/90 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400">
                Official Municipal Workflow
              </p>
              <h2 className="text-base font-bold text-white">Civic Issue Lifecycle Progression</h2>
            </div>
            <StatusBadge status={issue.status} />
          </div>

          <div className="relative flex items-center justify-between mt-6">
            <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-white/10 -z-0" />
            <div
              className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500 -z-0"
              style={{ width: `${Math.max(0, Math.min(100, (stepIdx / 5) * 100))}%` }}
            />

            {TIMELINE_STEPS.map((step, idx) => {
              const isDone = stepIdx >= idx;
              const isCurrent = stepIdx === idx;

              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ring-4 ring-[#10182A] ${
                      isCurrent
                        ? "bg-cyan-400 text-slate-900 shadow-lg shadow-cyan-400/50 scale-125"
                        : isDone
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {isDone ? "✓" : idx + 1}
                  </div>
                  <span
                    className={`mt-2 text-xs font-bold ${
                      isCurrent ? "text-cyan-400" : isDone ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="hidden sm:inline-block text-[10px] text-slate-400 mt-0.5">
                    {step.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verification CTA Banner if Resolved */}
        {issue.status === "RESOLVED" && (
          <div className="mb-6 rounded-3xl border border-emerald-500/40 bg-emerald-500/15 p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="inline-block rounded-lg bg-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-300">
                ⭐ READY FOR CITIZEN VERIFICATION
              </span>
              <h3 className="text-lg font-bold text-white mt-1.5">Repairs Completed by Field Engineer</h3>
              <p className="text-xs text-emerald-200/90 mt-1">
                Please verify if the reported civic problem has been satisfactorily repaired.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/feedback"
                className="rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 transition"
              >
                Rate & Review ⭐
              </Link>
              {(isReporter || isAdmin) && (
                <button
                  onClick={() => setVerifyOpen(true)}
                  className="btn-shine shrink-0 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-bold text-slate-900 hover:brightness-110 shadow-xl shadow-emerald-500/30 cursor-pointer"
                >
                  ✓ Verify & Sign Off
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            2. MAIN DETAIL CARD
            ======================================================== */}
        <div className="card p-6 sm:p-8 border border-white/10 bg-[#10182A]/85 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryChip category={issue.category} />
              <PriorityBadge priority={issue.priority} />
            </div>
            <StatusBadge status={issue.status} />
          </div>

          <h1 className="mt-4 text-2xl font-black text-white sm:text-3xl">{issue.title}</h1>
          <p className="mt-3 whitespace-pre-line text-sm text-slate-300 leading-relaxed">{issue.description}</p>

          {/* Rejection notice if rejected */}
          {issue.status === "REJECTED" && (
            <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-300">
              <p className="text-sm">❌ Report Rejected</p>
              <p className="mt-1 font-normal">Reason: {issue.rejectionReason || "Did not meet submission criteria."}</p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-slate-400 font-semibold">Location</p>
              <p className="mt-1 font-bold text-white">📍 {issue.location}</p>
              {Number.isFinite(issue.latitude) && Number.isFinite(issue.longitude) && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block font-bold text-cyan-400 hover:underline"
                >
                  GPS Directions ↗
                </a>
              )}
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Ward</p>
              <p className="mt-1 font-bold text-white">{issue.ward || "City-wide"}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Reported By</p>
              <p className="mt-1 font-bold text-white">
                👤 {issue.user?.name || "Citizen"} · {fmtDate(issue.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Assigned Engineer</p>
              <p className="mt-1 font-bold text-cyan-400">
                {issue.assignedTo ? `🔧 ${issue.assignedTo.name}` : "Unassigned"}
              </p>
            </div>
          </div>

          {/* AI Triage Banner */}
          {issue.aiDepartment && (
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-200">
              <span className="text-base">🤖</span>
              <p>
                <b>AI Classification:</b> Categorized as <b>{issue.aiCategory}</b> with <b>{issue.aiPriority}</b> priority.
                Routed to <b>{issue.aiDepartment}</b>.
              </p>
            </div>
          )}

          {/* Resolution Note if Present */}
          {issue.resolutionNote && (
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
              <span className="text-base">✅</span>
              <div>
                <p className="font-bold text-white">Official Resolution Note:</p>
                <p className="mt-1 leading-relaxed">{issue.resolutionNote}</p>
                {issue.resolvedAt && (
                  <p className="mt-1.5 text-[10px] text-emerald-400 font-semibold">Signed off on {fmtDate(issue.resolvedAt)}</p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              3. BEFORE & AFTER PHOTOS COMPARISON GALLERY
              ======================================================== */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                📷 Evidence & Resolution Proof ({images.length})
              </h3>
              {(isReporter || isAdmin || isAssignedEngineer) && (
                <label className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10">
                  + Add Photo
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => addImage(e.target.files)}
                  />
                </label>
              )}
            </div>

            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="group relative h-36 overflow-hidden rounded-2xl border border-white/10 bg-slate-800"
                  >
                    <a href={img.url} target="_blank" rel="noreferrer" title="Open full image">
                      <img
                        src={img.url}
                        alt="Evidence"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </a>
                    <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur">
                      {idx === 0 ? "Initial" : `Proof #${idx + 1}`}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => deleteImage(img.id)}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-600"
                        title="Remove"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center text-xs text-slate-400">
                No photo evidence uploaded yet.
              </p>
            )}
          </div>

          {/* Action Row */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={upvote}
              className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                voted
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              <span>👍</span>
              <span>{issue.upvotes} {voted ? "Upvoted" : "Upvote"}</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {/* Admin Actions */}
              {isAdmin && issue.status === "PENDING_APPROVAL" && (
                <>
                  <button onClick={handleApprove} disabled={busy} className="btn btn-primary text-xs py-2 px-3">
                    ✓ Approve
                  </button>
                  <button onClick={() => setAssignOpen(true)} disabled={busy} className="btn btn-soft text-xs py-2 px-3">
                    ✓ Approve & Assign
                  </button>
                  <button
                    onClick={() => setRejectOpen(true)}
                    disabled={busy}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
                  >
                    ✕ Reject
                  </button>
                </>
              )}

              {/* Engineer Actions */}
              {(isAssignedEngineer || isAdmin) && issue.status === "ASSIGNED" && (
                <button onClick={handleStartWork} disabled={busy} className="btn btn-primary text-xs py-2 px-4">
                  🚀 Start Field Work
                </button>
              )}

              {(isAssignedEngineer || isAdmin) && issue.status === "IN_PROGRESS" && (
                <button
                  onClick={() => setResolveOpen(true)}
                  disabled={busy}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-bold text-slate-900 hover:brightness-110 shadow-lg shadow-emerald-500/25"
                >
                  ✓ Sign Off & Mark Resolved
                </button>
              )}

              {/* Verify Action */}
              {(isReporter || isAdmin) && issue.status === "RESOLVED" && (
                <button
                  onClick={() => setVerifyOpen(true)}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-900 shadow hover:bg-emerald-400"
                >
                  ⭐ Verify Resolution
                </button>
              )}

              {canDelete && (
                <button
                  onClick={removeIssue}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
                >
                  🗑 Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            4. AUDIT TRAIL / TIMELINE HISTORY
            ======================================================== */}
        <div className="mt-8 card p-6 border border-white/10 bg-[#10182A]/85 backdrop-blur-xl">
          <h2 className="text-base font-bold text-white">Audit Trail & Status History</h2>
          <p className="text-xs text-slate-400">Verifiable chronological audit log of all transitions</p>

          <div className="relative mt-6 pl-6 border-l-2 border-blue-500/30 space-y-6">
            {statusHistory.map((item, index) => {
              const isLatest = index === 0;
              return (
                <div key={item.id} className="relative">
                  <span
                    className={`absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-[#10182A] ${
                      isLatest ? "bg-cyan-400" : "bg-blue-600"
                    }`}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-white">{item.toStatus}</span>
                    <span className="text-slate-400">by {item.changedBy?.name || "System"}</span>
                    <span className="text-[10px] text-slate-500">· {timeAgo(item.createdAt)}</span>
                  </div>
                  {item.note && <p className="mt-1 text-xs text-slate-300">{item.note}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================
            5. COMMENTS (OFFICIAL VS CITIZEN)
            ======================================================== */}
        <div className="mt-8 card p-6 border border-white/10 bg-[#10182A]/85 backdrop-blur-xl">
          <h2 className="text-base font-bold text-white">Community & Municipal Discussion</h2>
          <p className="text-xs text-slate-400">Citizens and municipal engineers coordinating resolution</p>

          {commentError && (
            <p className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300">
              {commentError}
            </p>
          )}

          <form onSubmit={submitComment} className="mt-4">
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your observation or municipal update…"
              className="input w-full text-xs"
            />
            <div className="mt-2 flex justify-end">
              <button type="submit" disabled={busy || !comment.trim()} className="btn btn-primary text-xs">
                Post Comment
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {issue.comments?.map((c) => {
              const isStaff = c.user?.role === "ADMIN" || c.user?.role === "ENGINEER";

              return (
                <div
                  key={c.id}
                  className={`rounded-2xl p-4 text-xs border ${
                    isStaff
                      ? "border-blue-500/30 bg-blue-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{c.user?.name || "Citizen"}</span>
                      {isStaff && (
                        <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[9px] font-bold text-cyan-300 border border-blue-500/30">
                          {c.user?.role === "ADMIN" ? "MUNICIPAL ADMIN" : "WARD ENGINEER"}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed">{c.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================
          VERIFICATION MODAL
          ======================================================== */}
      {verifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-900 p-6 shadow-2xl animate-pop">
            <h3 className="text-lg font-bold text-white">Verify Resolution</h3>
            <p className="text-xs text-slate-400 mt-1">
              Confirm that #{issue.id} has been repaired satisfactorily.
            </p>
            <textarea
              rows={3}
              value={verifyFeedback}
              onChange={(e) => setVerifyFeedback(e.target.value)}
              placeholder="Verification feedback (e.g. road is smooth and safe again)…"
              className="input mt-4 w-full text-xs"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setVerifyOpen(false)} className="btn btn-ghost text-xs">
                Cancel
              </button>
              <button onClick={handleVerify} disabled={busy} className="btn btn-primary text-xs">
                ✓ Confirm & Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          RESOLVE MODAL
          ======================================================== */}
      {resolveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-slate-900 p-6 shadow-2xl animate-pop">
            <h3 className="text-lg font-bold text-white">Mark Resolved & Upload Proof</h3>
            <p className="text-xs text-slate-400 mt-1">
              Provide sign-off notes and attach after-repair photo evidence.
            </p>

            <div className="mt-4 space-y-3">
              <label className="text-xs font-semibold text-slate-300">Proof Photo (After Fix)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPickResolvePhoto(e.target.files)}
                className="input w-full text-xs"
              />
              {resolvePhoto && (
                <img src={resolvePhoto.url} alt="After" className="h-28 w-full object-cover rounded-xl mt-2" />
              )}

              <label className="text-xs font-semibold text-slate-300 block mt-2">Resolution Note (Required)</label>
              <textarea
                rows={3}
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="Explain the fix carried out and verification tests…"
                className="input w-full text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setResolveOpen(false)} className="btn btn-ghost text-xs">
                Cancel
              </button>
              <button onClick={confirmResolve} disabled={busy || !resolveNote.trim()} className="btn btn-primary text-xs">
                ✓ Sign Off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ASSIGN MODAL
          ======================================================== */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-900 p-6 shadow-2xl animate-pop">
            <h3 className="text-lg font-bold text-white">Assign Ward Engineer</h3>
            <select
              value={selectedEng}
              onChange={(e) => setSelectedEng(e.target.value)}
              className="input mt-4 w-full text-xs"
            >
              <option value="">-- Choose Engineer --</option>
              {engineers.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name} ({eng.department || eng.ward || "Field Staff"})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setAssignOpen(false)} className="btn btn-ghost text-xs">
                Cancel
              </button>
              <button onClick={handleAssign} disabled={busy || !selectedEng} className="btn btn-primary text-xs">
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
