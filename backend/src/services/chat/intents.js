/**
 * Scored Intent Classifier and Entity Extraction
 */

// Normalized Bengaluru wards
const KNOWN_WARDS = [
  { full: "Ward 42 – Majestic", aliases: ["majestic", "ward 42", "chickpet", "city market"] },
  { full: "Ward 84 – Koramangala", aliases: ["koramangala", "ward 84", "sony world", "ejipura"] },
  { full: "Ward 76 – Indiranagar", aliases: ["indiranagar", "ward 76", "100 feet road", "cmh road", "halasuru"] },
  { full: "Ward 150 – Whitefield", aliases: ["whitefield", "ward 150", "itpl", "hoodi"] },
  { full: "Ward 163 – Jayanagar", aliases: ["jayanagar", "ward 163", "south end circle", "basavanagudi"] },
  { full: "Ward 4 – Yelahanka", aliases: ["yelahanka", "ward 4", "airport road"] },
  { full: "Ward 27 – Hebbal", aliases: ["hebbal", "ward 27", "manyata"] },
  { full: "Ward 178 – Banashankari", aliases: ["banashankari", "ward 178", "kumaraswamy layout"] },
  { full: "Ward 66 – Rajajinagar", aliases: ["rajajinagar", "ward 66", "dr rajkumar road"] },
  { full: "Ward 152 – Marathahalli", aliases: ["marathahalli", "ward 152", "outer ring road", "kadugodi"] },
  { full: "Ward 38 – Malleshwaram", aliases: ["malleshwaram", "ward 38", "sankey"] },
  { full: "Ward 180 – Electronic City", aliases: ["electronic city", "ward 180", "neeladri"] },
];

const CATEGORY_SYNONYMS = {
  ROAD: ["road", "pothole", "potholes", "pavement", "footpath", "sidewalk", "speed breaker", "speedbreaker", "asphalt", "tar", "crater"],
  STREET_LIGHT: ["street light", "streetlight", "street lights", "streetlights", "lamp", "lamppost", "lighting", "dark street", "flickering light"],
  WATER: ["water", "pipe", "drain", "drainage", "sewage", "leak", "leakage", "manhole", "water supply", "drinking water", "flood", "stagnation"],
  SANITATION: ["garbage", "trash", "waste", "dumping", "rubbish", "litter", "sanitation", "stinking", "odor", "dead animal", "overflowing bin"],
  ELECTRICITY: ["electricity", "power", "electric", "pole", "wire", "wires", "transformer", "spark", "sparking", "short circuit", "voltage"],
  PARK: ["park", "garden", "tree", "branch", "swings", "playground", "grass", "lawn", "horticulture"],
  GAS: ["gas", "pipeline", "lpg", "gas leak", "gas smell", "trench", "excavation"],
  OTHER: ["other", "abandoned vehicle", "encroachment", "noise", "hoarding", "billboard"],
};

const STATUS_SYNONYMS = {
  OPEN: ["open", "active", "unresolved", "not fixed", "pending fix", "newly opened"],
  ASSIGNED: ["assigned", "dispatched", "given to engineer"],
  IN_PROGRESS: ["being solved", "in progress", "under repair", "underway", "fixing", "working on", "ongoing", "under maintenance", "being fixed"],
  RESOLVED: ["solved", "fixed", "completed", "done", "closed", "resolved", "repaired"],
  PENDING_APPROVAL: ["pending approval", "awaiting approval", "awaiting review", "unapproved", "pending triage", "new reports"],
  REJECTED: ["rejected", "declined", "dismissed", "invalid"],
};

/**
 * Levenshtein distance for typo tolerance
 */
export function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Fuzzy word matching allowing small typos
 */
export function fuzzyIncludes(text, keyword, maxDistance = 1) {
  if (text.includes(keyword)) return true;
  if (keyword.length <= 4) return false;

  const words = text.split(/\s+/);
  for (const w of words) {
    if (Math.abs(w.length - keyword.length) <= maxDistance) {
      if (levenshteinDistance(w, keyword) <= maxDistance) return true;
    }
  }
  return false;
}

/**
 * Entity Extraction
 */
export function extractEntities(rawText, context = null) {
  const text = rawText.toLowerCase().trim();
  const entities = {
    ward: null,
    category: null,
    status: null,
    priority: null,
    dateRange: null,
    issueId: null,
    compareWards: null,
  };

  // 1. Issue ID
  const issueMatch = text.match(/(?:issue|complaint|#|id|no|number)\s*#?\s*(\d{1,6})/i);
  if (issueMatch) {
    entities.issueId = parseInt(issueMatch[1], 10);
  }

  // 2. Comparison detection: "compare X and Y" or "X vs Y"
  const compMatch = text.match(/compare\s+([a-z0-9\s–-]+)\s+(?:and|with|to|vs)\s+([a-z0-9\s–-]+)/i) ||
                    text.match(/([a-z0-9\s–-]+)\s+vs\.?\s+([a-z0-9\s–-]+)/i);
  if (compMatch) {
    const partA = compMatch[1].trim();
    const partB = compMatch[2].trim();
    const wardA = matchWard(partA);
    const wardB = matchWard(partB);
    if (wardA && wardB) {
      entities.compareWards = [wardA, wardB];
    }
  }

  // 3. Ward detection
  if (!entities.compareWards) {
    entities.ward = matchWard(text);
  }

  // 4. Category detection (order: check specific ones first like GAS before generic WATER)
  const categoryOrder = ["GAS", "ROAD", "STREET_LIGHT", "ELECTRICITY", "SANITATION", "PARK", "WATER", "OTHER"];
  for (const cat of categoryOrder) {
    const words = CATEGORY_SYNONYMS[cat];
    for (const w of words) {
      if (fuzzyIncludes(text, w, w.length > 5 ? 1 : 0)) {
        entities.category = cat;
        break;
      }
    }
    if (entities.category) break;
  }

  // 5. Status detection
  for (const [st, words] of Object.entries(STATUS_SYNONYMS)) {
    for (const w of words) {
      if (fuzzyIncludes(text, w, 0)) {
        entities.status = st;
        break;
      }
    }
    if (entities.status) break;
  }

  // 6. Priority detection
  if (/critical|emergency|severe|dangerous/.test(text)) entities.priority = "CRITICAL";
  else if (/high priority|urgent|immediate/.test(text)) entities.priority = "HIGH";
  else if (/medium priority/.test(text)) entities.priority = "MEDIUM";
  else if (/low priority/.test(text)) entities.priority = "LOW";

  // 7. Date range extraction
  entities.dateRange = extractDateRange(text);

  // 8. Follow-up handling from conversation context
  if (context) {
    const isFollowUp = /^(and\s+in|what\s+about|how\s+about|and|in|what\s+of)\b/i.test(text);
    if (isFollowUp) {
      if (!entities.ward && context.lastEntities.ward) entities.ward = context.lastEntities.ward;
      if (!entities.category && context.lastEntities.category) entities.category = context.lastEntities.category;
      if (!entities.status && context.lastEntities.status) entities.status = context.lastEntities.status;
    }
  }

  return entities;
}

function matchWard(text) {
  const t = text.toLowerCase();
  for (const w of KNOWN_WARDS) {
    if (t.includes(w.full.toLowerCase())) return w.full;
    for (const a of w.aliases) {
      if (fuzzyIncludes(t, a, a.length > 5 ? 1 : 0)) {
        return w.full;
      }
    }
  }
  return null;
}

function extractDateRange(text) {
  const now = new Date();

  // Today
  if (/\btoday\b/.test(text)) {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from, to: now, label: "today" };
  }

  // Yesterday
  if (/\byesterday\b/.test(text)) {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from, to, label: "yesterday" };
  }

  // This week / Last 7 days
  if (/this week|past week|last 7 days|in 7 days/.test(text)) {
    return { from: new Date(now.getTime() - 7 * 86400000), to: now, label: "this week" };
  }

  // Last week
  if (/last week/.test(text)) {
    return {
      from: new Date(now.getTime() - 14 * 86400000),
      to: new Date(now.getTime() - 7 * 86400000),
      label: "last week",
    };
  }

  // This month / Last 30 days
  if (/this month|current month|past month|last 30 days/.test(text)) {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: now, label: "this month" };
  }

  // Last month
  if (/last month/.test(text)) {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to, label: "last month" };
  }

  // Named month
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  for (let m = 0; m < months.length; m++) {
    if (text.includes(months[m])) {
      const yearMatch = text.match(/\b(202[4-9])\b/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : now.getFullYear();
      const from = new Date(year, m, 1);
      const to = new Date(year, m + 1, 1);
      return { from, to, label: `${months[m].charAt(0).toUpperCase() + months[m].slice(1)} ${year}` };
    }
  }

  return null;
}

/**
 * Scored Intent Classifier
 */
export function classifyIntent(rawText, entities, user = null) {
  const text = rawText.toLowerCase().trim();
  const scores = {};

  const addScore = (intent, points) => {
    scores[intent] = (scores[intent] || 0) + points;
  };

  // 1. Single Issue Lookup
  if (entities.issueId) {
    addScore("single_issue", 100);
    if (/history|timeline|journey|milestones|track|audit/.test(text)) {
      addScore("single_issue_history", 60);
    }
  }

  // 2. Comparisons
  if (entities.compareWards) {
    addScore("compare_wards", 90);
  } else if (/compare.*month|month.*over.*month|mom|trend|this month vs|monthly.*(resolution|statistics|stats|report|trend)|resolution.*(statistics|stats|trend)/i.test(text)) {
    addScore("month_comparison", 85);
  }

  // 3. Status and Count queries
  // Specific status requests:
  if (entities.status === "OPEN" || /how many.*open|open issues|unresolved/i.test(text)) {
    addScore("count_open", 50);
  }
  if (entities.status === "IN_PROGRESS" || /being solved|being fixed|in progress|ongoing/i.test(text)) {
    addScore("count_in_progress", 50);
  }
  if (entities.status === "RESOLVED" || /how many.*solved|how many.*resolved|fixed|completed/i.test(text)) {
    addScore("count_resolved", 50);
  }
  if (entities.status === "PENDING_APPROVAL" || /pending approval|pending review|unapproved/i.test(text)) {
    addScore("count_pending", 50);
  }
  if (entities.status === "REJECTED" || /how many.*rejected|rejected count/i.test(text)) {
    addScore("count_rejected", 50);
  }
  if (/total|count|overall|how many issues|summary/i.test(text)) {
    addScore("counts_overview", 35);
  }

  // 4. Performance & Turnaround Metrics
  if (/average.*(fix|resolution|turnaround).*time|resolution rate|how fast|median fix time|fastest category|slowest category/i.test(text)) {
    addScore("resolution_metrics", 80);
  }

  // 5. Oldest Unresolved / Backlog
  if (/oldest.*(issue|complaint|unresolved)|longest pending|backlog age|oldest complaint/i.test(text)) {
    addScore("oldest_unresolved", 85);
  }

  // 6. Top Hotspots / Busiest Wards & Categories & Departments
  if (/which department|top department|department.*(performance|pending|issues|complaints)|department stats|which dept/i.test(text)) {
    addScore("department_performance", 85);
  }
  if (/which (ward|area|place|neighborhood|location)|top (ward|area)|busiest (ward|area)|most (complaints|issues|potholes|garbage|leaks)|ward with most|area with most/i.test(text)) {
    addScore("top_wards", 80);
  }
  if (/top.*category|most common|most frequent|common problem|frequently reported/i.test(text)) {
    addScore("top_categories", 75);
  }
  if (/repeat.*problem|hotspots?|recurrent|same place/i.test(text)) {
    addScore("repeat_hotspots", 75);
  }
  if (entities.priority) {
    addScore("counts_overview", 50);
  }

  // 7. Role-specific intents
  if (/my issues|my complaints|my reports|reported by me/i.test(text)) {
    addScore("my_issues", 70);
  }
  if (/my work|assigned to me|my tasks|workload/i.test(text)) {
    addScore("engineer_workload", 70);
  }

  // 8. Platform FAQs & Rules
  if (/how (do|can|to) (i )?report|steps to report|file (a )?complaint/i.test(text)) {
    addScore("faq_report", 70);
  }
  if (/approval process|who approves|why pending/i.test(text)) {
    addScore("faq_approval", 70);
  }
  if (/roles|three roles|admin vs engineer|citizen role/i.test(text)) {
    addScore("faq_roles", 70);
  }
  if (/photo rules|image requirements|after photo/i.test(text)) {
    addScore("faq_photos", 70);
  }
  if (/privacy|personal data|phone number/i.test(text)) {
    addScore("faq_privacy", 70);
  }
  if (/target.*sla|sla.*deadline|deadline.*department|department.*sla/i.test(text)) {
    addScore("faq_sla", 85);
  } else if (/sla|timeline|how long/i.test(text)) {
    addScore("faq_sla", 70);
  }
  if (/helpline|emergency number|who to call|contact number/i.test(text)) {
    addScore("faq_helplines", 85);
  }
  if (/duplicate|already reported|same issue/i.test(text)) {
    addScore("faq_duplicate", 85);
  }
  if (/live.*wire|wire.*spark|sparking.*wire|sparking.*electric|transformer spark/i.test(text)) {
    addScore("faq_sparking_wire", 95);
  }
  if (/engineer.*(update|workflow|receive)|how.*(engineer|field).*(update|receive)/i.test(text)) {
    addScore("faq_engineer_workflow", 90);
  }
  if (/life.?safety|urgent hazard|report urgent/i.test(text)) {
    addScore("faq_urgent_hazard", 90);
  }

  // 9. Greetings & Polite messages
  if (/^(hi|hello|hey|namaste|greetings|good (morning|afternoon|evening))\b/i.test(text)) {
    addScore("greeting", 60);
  }
  if (/^(thanks|thank you|thx|awesome|great)\b/i.test(text)) {
    addScore("thanks", 60);
  }

  // Default if entity matches ward or category
  if (entities.ward && Object.keys(scores).length === 0) {
    addScore("ward_overview", 40);
  }
  if (entities.category && Object.keys(scores).length === 0) {
    addScore("category_overview", 40);
  }

  // Sort scores descending
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primaryIntent = sorted.length ? sorted[0][0] : "general_help";
  const confidence = sorted.length ? sorted[0][1] : 0;

  return {
    primaryIntent,
    confidence,
    secondaryIntents: sorted.slice(1).map((s) => s[0]),
  };
}
