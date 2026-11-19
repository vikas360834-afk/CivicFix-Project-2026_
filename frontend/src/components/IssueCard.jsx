import { Link, useNavigate } from "react-router-dom";
import { StatusBadge, PriorityBadge, CategoryChip } from "./Badges.jsx";
import { timeAgo, fmtDate, issuePhoto, calculateAIScore, DEPARTMENT_MAPPING } from "../utils.js";
import {
  MapPin,
  Calendar,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Navigation,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";

export default function IssueCard({ issue, onQuickView }) {
  const navigate = useNavigate();
  const thumb = issuePhoto(issue);
  const aiScore = issue.aiScore || calculateAIScore(issue);
  const dept = issue.aiDepartment || DEPARTMENT_MAPPING[issue.category] || "Public Works Department";

  return (
    <div className="glass-panel glass-panel-interactive group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-md transition-all duration-300 hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-900/85">
      {/* Card Header Media */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={thumb}
          alt={issue.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => (e.currentTarget.src = "/img/hero.jpg")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

        {/* Top Floating Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          <CategoryChip category={issue.category} />
          <span className="inline-flex items-center gap-1 rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
            #{issue.id}
          </span>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <PriorityBadge priority={issue.priority} />
          {issue.images?.length > 1 && (
            <span className="rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
              📷 {issue.images.length}
            </span>
          )}
        </div>

        {/* AI Confidence / Urgency Score Pill */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
          <div className="inline-flex items-center gap-1 rounded-full bg-blue-600/90 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-amber-300" />
            AI Score {aiScore}%
          </div>
          {issue.isOverdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
              <Clock className="h-2.5 w-2.5" /> Overdue
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4.5">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/issues/${issue.id}`} className="flex-1">
            <h3 className="line-clamp-2 font-bold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 text-base leading-snug">
              {issue.title}
            </h3>
          </Link>
        </div>

        <p className="mt-1.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {issue.description}
        </p>

        {/* Department Banner */}
        <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50/70 px-2.5 py-1.5 text-[11px] font-medium text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
          <Building className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          <span className="truncate">{dept}</span>
        </div>

        {/* Location & Date */}
        <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{issue.location} {issue.ward ? `(${issue.ward})` : ""}</span>
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
              {fmtDate(issue.createdAt)} ({timeAgo(issue.createdAt)})
            </span>
            <div className="flex items-center gap-3 font-semibold text-[11px]">
              <span className="inline-flex items-center gap-1 hover:text-blue-600">
                <ThumbsUp className="h-3 w-3" /> {issue.upvotes || 0}
              </span>
              <span className="inline-flex items-center gap-1 hover:text-blue-600">
                <MessageSquare className="h-3 w-3" /> {issue._count?.comments ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Status & Footer Actions */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <StatusBadge status={issue.status} />

          <div className="flex items-center gap-1.5">
            <Link
              to={`/issues/${issue.id}`}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Details <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              to={`/track?id=${issue.id}`}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 hover:shadow-blue-500/20"
            >
              <Navigation className="h-3 w-3" /> Track
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
