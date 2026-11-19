import prisma from "../config/prisma.js";
import { processChatMessage } from "./chat/index.js";

/* ------------------------------------------------------------------ */
/* 1. CATEGORY CLASSIFIER (keyword / NLP scoring)                      */
/* ------------------------------------------------------------------ */

const CATEGORY_KEYWORDS = {
  ROAD: [
    "pothole", "potholes", "road", "pavement", "speed breaker", "speedbreaker", "bump",
    "tar", "asphalt", "crack", "divider", "hump", "footpath", "sidewalk", "crater", "road damage",
  ],
  STREET_LIGHT: [
    "street light", "streetlight", "street lights", "lamp", "light not working", "dark",
    "lighting", "glow", "bulb", "lamppost", "illumination", "darkness",
  ],
  WATER: [
    "water", "leak", "pipe", "supply", "water supply", "tap", "boring", "borewell",
    "flood", "seepage", "contaminated", "dripping", "water leakage",
  ],
  DRAINAGE: [
    "drain", "drainage", "sewage", "overflow", "manhole", "gutter", "clogged drain",
    "stormwater", "culvert", "blocked drain",
  ],
  SANITATION: [
    "garbage", "waste", "trash", "litter", "dumping", "dump", "refuse",
    "bin", "stagnant", "smell", "odor", "odour", "sweeping", "dirt", "dead animal", "solid waste",
  ],
  PUBLIC_PROPERTY: [
    "public property", "bench", "fountain", "bus stop", "shelter", "fence", "railing",
    "vandalism", "playground", "broken gate", "park bench",
  ],
  TRAFFIC: [
    "traffic", "signal", "jam", "congestion", "zebra crossing", "signboard", "parking",
    "illegal parking", "speeding", "intersection",
  ],
  ELECTRICITY: [
    "power", "electric", "wire", "wires", "transformer", "shock", "cable", "current",
    "fuse", "voltage", "mast", "short circuit", "spark", "sparking",
  ],
  PARK: [
    "park", "garden", "tree", "branch", "playground", "grass", "fountain",
    "bench", "swing", "swings", "lawn",
  ],
  GAS: [
    "gas", "lpg", "cylinder", "pipeline", "cooking gas", "gas leak",
    "smell of gas", "gas smell", "leaking gas", "trench",
  ],
};

const CATEGORY_LABELS = {
  ROAD: "Road Damage & Potholes",
  STREET_LIGHT: "Street Lights",
  WATER: "Water Leakage",
  DRAINAGE: "Drainage & Sewage",
  SANITATION: "Garbage & Waste",
  PUBLIC_PROPERTY: "Public Property Damage",
  TRAFFIC: "Traffic Issues",
  ELECTRICITY: "Electricity",
  PARK: "Park & Garden",
  GAS: "Gas / Pipeline",
  OTHER: "Other Civic Issues",
};

const DEPARTMENT_BY_CATEGORY = {
  ROAD: "Public Works Department",
  STREET_LIGHT: "Electrical & Lighting Division",
  WATER: "Water Supply & Sewerage Board",
  DRAINAGE: "Stormwater & Drainage Division",
  SANITATION: "Sanitation Department",
  PUBLIC_PROPERTY: "Public Works & Assets",
  TRAFFIC: "Traffic & Road Safety Authority",
  ELECTRICITY: "Electricity Board",
  PARK: "Horticulture / Parks Division",
  GAS: "Gas & Utilities Department",
  OTHER: "General Administration",
};

/** Score every category against the text; return best match. */
export function suggestCategory(text = "") {
  const t = text.toLowerCase();
  let best = "OTHER";
  let bestScore = 0;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const w of words) {
      if (t.includes(w)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return { category: best, label: CATEGORY_LABELS[best] };
}

export function suggestDepartment(category) {
  return DEPARTMENT_BY_CATEGORY[category] || DEPARTMENT_BY_CATEGORY.OTHER;
}

/* ------------------------------------------------------------------ */
/* 2. PRIORITY SUGGESTION                                              */
/* ------------------------------------------------------------------ */

const CRITICAL_WORDS = [
  "accident", "injured", "fire", "gas leak", "collapse", "fallen", "live wire",
  "electrocution", "severe", "dangerous", "burst", "sinkhole", "flooding",
  "sewage overflow", "open manhole",
];
const HIGH_WORDS = [
  "no water", "no power", "blocked", "leakage", "overflow", "broken",
  "not working", "damaged", "stagnant", "dumping", "spark", "rodent",
  "mosquito", "health",
];

/** Suggest priority from complaint text + community signals. */
export function suggestPriority(text = "", { upvotes = 0, daysOpen = 0 } = {}) {
  const t = text.toLowerCase();
  let priority = "MEDIUM";
  if (CRITICAL_WORDS.some((w) => t.includes(w))) priority = "CRITICAL";
  else if (HIGH_WORDS.some((w) => t.includes(w))) priority = "HIGH";
  else if (t.length < 40) priority = "LOW";

  // Community signal boost
  if (upvotes >= 10) priority = priority === "CRITICAL" ? "CRITICAL" : "HIGH";
  if (upvotes >= 25) priority = "CRITICAL";
  if (daysOpen >= 30 && priority === "MEDIUM") priority = "HIGH";

  return priority;
}

/** Full auto-classification used when an issue is created. */
export function classifyIssue(title = "", description = "", extra = {}) {
  const text = `${title} ${description}`;
  const { category, label } = suggestCategory(text);
  const priority = suggestPriority(text, extra);
  const department = suggestDepartment(category);

  // Calculate AI Score (0-100)
  let score = 50;
  if (priority === "CRITICAL") score = 92;
  else if (priority === "HIGH") score = 76;
  else if (priority === "LOW") score = 32;
  if (extra.upvotes >= 10) score = Math.min(98, score + 10);

  return {
    category,
    categoryLabel: label,
    priority,
    score,
    department,
    confidence: "auto",
  };
}

/* ------------------------------------------------------------------ */
/* 3. CHATBOT ENTRYPOINT                                               */
/* ------------------------------------------------------------------ */

export async function chatReply(message, user = null, history = []) {
  return processChatMessage(message, user, history);
}

export { processChatMessage };