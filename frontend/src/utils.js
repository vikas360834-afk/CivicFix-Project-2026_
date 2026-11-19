export const CATEGORY_LABELS = {
  ROAD: "Road Damage & Potholes",
  STREET_LIGHT: "Street Lights",
  WATER: "Water Leakage & Supply",
  DRAINAGE: "Drainage & Sewage",
  SANITATION: "Garbage & Waste",
  PUBLIC_PROPERTY: "Public Property Damage",
  TRAFFIC: "Traffic Issues",
  ELECTRICITY: "Electricity",
  PARK: "Park & Garden",
  GAS: "Gas / Pipeline",
  OTHER: "Other Civic Issues",
};

export const CATEGORY_EMOJI = {
  ROAD: "🛣️",
  STREET_LIGHT: "💡",
  WATER: "💧",
  DRAINAGE: "🌊",
  SANITATION: "🗑️",
  PUBLIC_PROPERTY: "🏛️",
  TRAFFIC: "🚦",
  ELECTRICITY: "⚡",
  PARK: "🌳",
  GAS: "🔥",
  OTHER: "📍",
};

export const DEPARTMENT_MAPPING = {
  ROAD: "Public Works Department (Roads)",
  STREET_LIGHT: "Electrical & Streetlight Division",
  WATER: "Water Supply & Sewerage Board (BWSSB)",
  DRAINAGE: "Stormwater & Drainage Division",
  SANITATION: "Sanitation & Solid Waste Management",
  PUBLIC_PROPERTY: "Public Works & Asset Management",
  TRAFFIC: "Traffic & Road Safety Authority",
  ELECTRICITY: "Electricity Board (BESCOM)",
  PARK: "Horticulture & Parks Division",
  GAS: "Gas & Utilities Department",
  OTHER: "City Administration & Public Grievance",
};

export const STATUS_META = {
  PENDING_APPROVAL: {
    label: "Submitted",
    subLabel: "Pending Review",
    cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
    badgeCls: "bg-purple-600 text-white",
    dot: "🟣",
    color: "#9333ea",
  },
  OPEN: {
    label: "Verified",
    subLabel: "Approved",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    badgeCls: "bg-amber-500 text-white",
    dot: "🟠",
    color: "#f59e0b",
  },
  ASSIGNED: {
    label: "Assigned",
    subLabel: "Department Notified",
    cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
    badgeCls: "bg-blue-600 text-white",
    dot: "🔵",
    color: "#2563eb",
  },
  IN_PROGRESS: {
    label: "In Progress",
    subLabel: "Work Underway",
    cls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60",
    badgeCls: "bg-cyan-600 text-white",
    dot: "⚙️",
    color: "#0891b2",
  },
  RESOLVED: {
    label: "Resolved",
    subLabel: "Proof Uploaded",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    badgeCls: "bg-emerald-600 text-white",
    dot: "✅",
    color: "#059669",
  },
  REJECTED: {
    label: "Rejected",
    subLabel: "Declined",
    cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
    badgeCls: "bg-rose-600 text-white",
    dot: "❌",
    color: "#e11d48",
  },
  ESCALATED: {
    label: "Escalated",
    subLabel: "Urgent Attention",
    cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60 animate-pulse",
    badgeCls: "bg-red-600 text-white",
    dot: "⚠️",
    color: "#dc2626",
  },
  CLOSED: {
    label: "Closed",
    subLabel: "Citizen Verified",
    cls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    badgeCls: "bg-slate-600 text-white",
    dot: "⚪",
    color: "#64748b",
  },
};
export const STATUS_CONFIG = STATUS_META;

export const PRIORITY_META = {
  LOW: {
    label: "Low Priority",
    cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700",
    badgeCls: "bg-slate-500 text-white",
    color: "#64748b",
  },
  MEDIUM: {
    label: "Medium Priority",
    cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60",
    badgeCls: "bg-sky-600 text-white",
    color: "#0284c7",
  },
  HIGH: {
    label: "High Priority",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",
    badgeCls: "bg-amber-600 text-white",
    color: "#d97706",
  },
  CRITICAL: {
    label: "Critical Priority",
    cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60 animate-pulse",
    badgeCls: "bg-red-600 text-white",
    color: "#dc2626",
  },
};

export const WARDS = [
  "Ward 42 – Majestic",
  "Ward 84 – Koramangala",
  "Ward 76 – Indiranagar",
  "Ward 150 – Whitefield",
  "Ward 163 – Jayanagar",
  "Ward 4 – Yelahanka",
  "Ward 27 – Hebbal",
  "Ward 178 – Banashankari",
  "Ward 66 – Rajajinagar",
  "Ward 152 – Marathahalli",
  "Ward 38 – Malleshwaram",
  "Ward 180 – Electronic City",
];

export const CATEGORIES = [
  { key: "ROAD", label: "Road Damage & Potholes", emoji: "🛣️", color: "#2563eb", iconName: "Route" },
  { key: "STREET_LIGHT", label: "Street Lights", emoji: "💡", color: "#eab308", iconName: "Lightbulb" },
  { key: "WATER", label: "Water Leakage", emoji: "💧", color: "#0ea5e9", iconName: "Droplets" },
  { key: "DRAINAGE", label: "Drainage & Sewage", emoji: "🌊", color: "#0891b2", iconName: "Waves" },
  { key: "SANITATION", label: "Garbage & Waste", emoji: "🗑️", color: "#10b981", iconName: "Trash2" },
  { key: "PUBLIC_PROPERTY", label: "Public Property Damage", emoji: "🏛️", color: "#8b5cf6", iconName: "Building2" },
  { key: "TRAFFIC", label: "Traffic Issues", emoji: "🚦", color: "#f97316", iconName: "Car" },
  { key: "ELECTRICITY", label: "Electricity", emoji: "⚡", color: "#f59e0b", iconName: "Zap" },
  { key: "PARK", label: "Park & Garden", emoji: "🌳", color: "#22c55e", iconName: "Trees" },
  { key: "GAS", label: "Gas / Pipeline", emoji: "🔥", color: "#ef4444", iconName: "Flame" },
  { key: "OTHER", label: "Other Civic Issues", emoji: "📍", color: "#64748b", iconName: "MapPin" },
];

export const CATEGORY_META = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

export const CATEGORY_IMAGE = {
  ROAD: "/img/pothole.jpg",
  STREET_LIGHT: "/img/streetlight.jpg",
  WATER: "/img/water.jpg",
  DRAINAGE: "/img/water.jpg",
  SANITATION: "/img/garbage.jpg",
  PUBLIC_PROPERTY: "/img/hero.jpg",
  TRAFFIC: "/img/city-street.jpg",
  ELECTRICITY: "/img/electricity.jpg",
  PARK: "/img/park.jpg",
  GAS: "/img/gas.jpg",
  OTHER: "/img/hero.jpg",
};

export const issuePhoto = (issue) =>
  issue?.images?.[0]?.url || CATEGORY_IMAGE[issue?.category] || "/img/hero.jpg";

export const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const fmtDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const timeAgo = (d) => {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd}d ago`;
  return fmtDate(d);
};

export const apiError = (err) =>
  err?.response?.data?.error || "Something went wrong. Please try again.";

/** Calculate smart AI score (0-100) based on severity, age, upvotes */
export const calculateAIScore = (issue) => {
  if (!issue) return 50;
  let score = 50;
  if (issue.priority === "CRITICAL") score = 92;
  else if (issue.priority === "HIGH") score = 78;
  else if (issue.priority === "MEDIUM") score = 56;
  else if (issue.priority === "LOW") score = 34;

  const upvotes = issue.upvotes || 0;
  score = Math.min(99, score + Math.min(20, upvotes * 2));

  if (issue.isOverdue) score = Math.min(99, score + 8);
  return score;
};
