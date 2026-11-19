import CountUp from "./CountUp.jsx";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({
  label,
  value,
  sub,
  emoji,
  icon: Icon,
  accent = "blue",
  trend,
  trendUp = true,
  onClick,
}) {
  const accents = {
    blue: {
      bar: "from-blue-500 to-indigo-600",
      glow: "hover:border-blue-500/40 hover:shadow-blue-500/10",
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      pill: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    },
    cyan: {
      bar: "from-cyan-500 to-blue-600",
      glow: "hover:border-cyan-500/40 hover:shadow-cyan-500/10",
      iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
      pill: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
    },
    emerald: {
      bar: "from-emerald-500 to-teal-600",
      glow: "hover:border-emerald-500/40 hover:shadow-emerald-500/10",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    amber: {
      bar: "from-amber-500 to-orange-500",
      glow: "hover:border-amber-500/40 hover:shadow-amber-500/10",
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      pill: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    },
    rose: {
      bar: "from-rose-500 to-pink-600",
      glow: "hover:border-rose-500/40 hover:shadow-rose-500/10",
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      pill: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    },
    violet: {
      bar: "from-purple-500 to-indigo-600",
      glow: "hover:border-purple-500/40 hover:shadow-purple-500/10",
      iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      pill: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
    },
    slate: {
      bar: "from-slate-500 to-slate-700",
      glow: "hover:border-slate-400 hover:shadow-slate-500/10",
      iconBg: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
      pill: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
  };

  const style = accents[accent] || accents.blue;

  return (
    <div
      onClick={onClick}
      className={`glass-panel glass-panel-interactive relative overflow-hidden rounded-2xl p-5 border border-slate-200/80 bg-white/85 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/85 ${
        style.glow
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${style.bar}`} />

      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        {Icon ? (
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        ) : (
          <span className="shrink-0 text-xl">{emoji}</span>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          <CountUp value={value} />
        </p>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              trendUp
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
            }`}
          >
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}
          </span>
        )}
      </div>

      {sub && (
        <p className="mt-1.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
          {sub}
        </p>
      )}
    </div>
  );
}
