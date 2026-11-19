import { STATUS_META, PRIORITY_META, CATEGORY_LABELS, CATEGORY_EMOJI } from "../utils.js";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldCheck,
  UserCheck,
  Flame,
  ArrowUpRight
} from "lucide-react";

export function StatusBadge({ status, size = "md" }) {
  const meta = STATUS_META[status] || STATUS_META.OPEN;
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide transition-all ${meta.cls} ${
        isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
    >
      <span className="text-xs">{meta.dot}</span>
      <span>{meta.label}</span>
    </span>
  );
}

export function PriorityBadge({ priority, size = "md" }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold ${meta.cls} ${
        isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      {priority === "CRITICAL" && <Flame className="h-3 w-3 text-red-500 animate-pulse" />}
      {meta.label}
    </span>
  );
}

export function CategoryChip({ category, small = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-1 font-semibold text-slate-800 shadow-2xs backdrop-blur dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-200 ${
        small ? "text-[11px]" : "text-xs"
      }`}
    >
      <span>{CATEGORY_EMOJI[category] || "📍"}</span>
      <span>{CATEGORY_LABELS[category] || category}</span>
    </span>
  );
}
