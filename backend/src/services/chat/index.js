import { ConversationContext } from "./context.js";
import { extractEntities, classifyIntent } from "./intents.js";
import * as queries from "./queries.js";
import * as formatters from "./formatter.js";
import { FAQS, CATEGORIES } from "./knowledge.js";

/**
 * Main Chat Processing Pipeline
 * @param {string} rawMessage - Message text
 * @param {object} user - Authenticated user object or null (guest)
 * @param {Array} history - Previous conversation turns (up to 6)
 */
export async function processChatMessage(rawMessage = "", user = null, history = []) {
  const message = (rawMessage || "").trim();

  // Cap message length for safety and denial-of-service protection
  if (message.length > 500) {
    return {
      reply: "Please keep your message within 500 characters so I can assist you effectively.",
      intent: "error",
      data: null,
    };
  }

  // Build conversation context
  const context = new ConversationContext(history);

  // Extract entities and classify intent
  const entities = extractEntities(message, context);
  const { primaryIntent } = classifyIntent(message, entities, user);

  // 1. Single Issue Lookup (with privacy check)
  if (primaryIntent === "single_issue" || primaryIntent === "single_issue_history") {
    // Guest privacy rule: guests cannot view single issue details
    if (!user) {
      return {
        reply: "🔒 Single issue details, timelines, and reporter information require logging in. Please log in to view specific complaint details, or ask for general ward/category statistics.",
        intent: "privacy_restricted",
        data: {
          suggestions: ["How many issues are open?", "How many are solved?", "Issues in Koramangala"],
        },
      };
    }

    const issue = await queries.getIssueWithHistory(entities.issueId, user);
    return formatters.formatSingleIssue(issue, primaryIntent === "single_issue_history");
  }

  // 2. Comparisons
  if (primaryIntent === "compare_wards" && entities.compareWards) {
    const comparison = await queries.compareWards(entities.compareWards[0], entities.compareWards[1]);
    return formatters.formatWardComparison(comparison);
  }

  if (primaryIntent === "month_comparison") {
    const trend = await queries.getMonthlyTrendComparison();
    return formatters.formatMonthlyTrend(trend);
  }

  // 3. User's Own Issues
  if (primaryIntent === "my_issues") {
    if (!user) {
      return {
        reply: "🔒 You need to log in to see your submitted complaints. Once logged in, ask 'my issues' or check your Profile page.",
        intent: "privacy_restricted",
        data: { suggestions: ["How many open issues?", "How to report?"] },
      };
    }
    const myCounts = await queries.getStatusCounts({ userId: user.id });
    return formatters.formatStatusCounts(myCounts, entities, `for your reported complaints`);
  }

  // 4. Engineer Workload
  if (primaryIntent === "engineer_workload") {
    if (!user || user.role === "USER") {
      return {
        reply: "Engineer workload assignment data is restricted to municipal staff and administrators.",
        intent: "privacy_restricted",
      };
    }
    if (user.role === "ENGINEER") {
      const myWork = await queries.getStatusCounts({ assignedToId: user.id });
      return formatters.formatStatusCounts(myWork, entities, `for your assigned workload`);
    }
    // Admin sees all engineers
    const workloads = await queries.getEngineerWorkloads();
    const reply = `👷 **Ward Engineer Workload Summary**:\n` +
      workloads.map((e) => `• **${e.name}** (${e.department || e.ward || "Field"}): ${e.activeTotal} active (${e.assigned} assigned, ${e.inProgress} in progress, ${e.resolved} resolved)`).join("\n");
    return {
      reply,
      intent: "engineer_workload",
      data: { cardType: "workloads", workloads },
    };
  }

  // 5. Counts: Open, Being Fixed (In Progress), Solved (Resolved), Pending, Rejected, Overview
  if (
    primaryIntent === "count_open" ||
    primaryIntent === "count_in_progress" ||
    primaryIntent === "count_resolved" ||
    primaryIntent === "count_pending" ||
    primaryIntent === "count_rejected" ||
    primaryIntent === "counts_overview" ||
    primaryIntent === "ward_overview" ||
    primaryIntent === "category_overview"
  ) {
    // Guest privacy rule: pending & rejected numbers are administrative
    if (!user && (primaryIntent === "count_pending" || primaryIntent === "count_rejected")) {
      return {
        reply: "🔒 Pending verification and rejected statistics are restricted to Municipal Administrators.",
        intent: "privacy_restricted",
      };
    }

    const counts = await queries.getStatusCounts(entities);

    // Optional LLM enhancement if key configured
    const llmResult = await tryLLMEnhancement(message, counts, entities);
    if (llmResult) {
      return {
        reply: llmResult,
        intent: primaryIntent,
        data: formatters.formatStatusCounts(counts, entities).data,
      };
    }

    return formatters.formatStatusCounts(counts, entities);
  }

  // 6. Resolution Metrics
  if (primaryIntent === "resolution_metrics") {
    const metrics = await queries.getResolutionMetrics(entities);
    return formatters.formatResolutionMetrics(metrics, entities);
  }

  // 7. Oldest Unresolved & Backlog
  if (primaryIntent === "oldest_unresolved") {
    if (message.toLowerCase().includes("backlog") || message.toLowerCase().includes("buckets")) {
      const buckets = await queries.getBacklogBuckets(entities);
      return formatters.formatBacklogBuckets(buckets);
    }
    const oldest = await queries.getOldestUnresolved(entities);
    return formatters.formatOldestUnresolved(oldest);
  }

  // 8. Top Wards, Categories & Department Performance
  if (primaryIntent === "top_wards") {
    const topWards = await queries.getTopWards(entities, 5);
    return formatters.formatTopWards(topWards, entities);
  }

  if (primaryIntent === "department_performance") {
    const depts = await queries.getDepartmentOverview();
    return formatters.formatDepartmentOverview(depts);
  }

  if (primaryIntent === "top_categories") {
    const topCats = await queries.getTopCategories(entities, 5);
    return formatters.formatTopCategories(topCats, entities);
  }

  if (primaryIntent === "repeat_hotspots") {
    const repeats = await queries.getRepeatProblemLocations(entities);
    if (!repeats.length) {
      return { reply: "No recurring problem hotspots detected at this time.", intent: "repeat_hotspots" };
    }
    const reply = `🔁 **Recurring Problem Hotspots**:\n` +
      repeats.map((r, i) => `${i + 1}. **${r.location}** (${r.ward || "City"}): ${r.count} complaints (${r.categories.join(", ")})`).join("\n");
    return {
      reply,
      intent: "repeat_hotspots",
      data: { cardType: "hotspots", hotspots: repeats },
    };
  }

  // 9. Emergency & Hazard Protocols
  const lowerMsg = message.toLowerCase();
  const isEmergency = /(live wire|electric shock|sparking|gas leak|cylinder leak|burst pipe|open manhole|sinkhole|tree collapse|falling tree|flooding|flood hazard|dangerous)/i.test(lowerMsg);
  if (isEmergency) {
    return {
      reply: `🚨 **EMERGENCY HAZARD NOTICE**:\n\n` +
        `If you are observing an active life-safety hazard, please **stay clear** and contact official municipal emergency desks immediately:\n` +
        `• ⚡ **BESCOM Electricity Emergencies**: Call **1912**\n` +
        `• 💧 **BWSSB Water & Sewage Helpline**: Call **1916**\n` +
        `• 🏢 **BBMP Central Disaster Control**: Call **1533** / 080-22660000\n` +
        `• 🚒 **Fire & Emergency Services**: Call **101**\n` +
        `• 🚓 **Police / Ambulance**: Call **112**\n\n` +
        `To dispatch field engineers via CivicFix, please click **[+ Report Issue](/report)** immediately with **Priority: Critical** so admins receive instant alert notifications.`,
      intent: "emergency",
      data: {
        cardType: "emergency_helplines",
        suggestions: ["How to report an issue", "Issues in Koramangala", "Show active complaints"],
      },
    };
  }

  // 10. Platform FAQs & Rules
  const FAQ_INTENT_MAP = {
    faq_helplines: "What are the official municipal emergency helpline numbers?",
    faq_sla: "What are the target SLA deadlines for each department?",
    faq_sparking_wire: "What should I do if a live power wire is sparking?",
    faq_duplicate: "How does AI detect duplicate complaints?",
    faq_engineer_workflow: "How do field engineers receive and update work orders?",
    faq_urgent_hazard: "How do I report an urgent life-safety hazard?",
    faq_report: "How do I report a civic issue?",
    faq_approval: "How does the approval process work?",
    faq_roles: "What are the roles in CivicFix?",
    faq_photos: "What are the rules for uploading photos?",
    faq_privacy: "How is my privacy protected?",
  };

  if (FAQ_INTENT_MAP[primaryIntent]) {
    const matched = FAQS.find((f) => f.question === FAQ_INTENT_MAP[primaryIntent]);
    if (matched) return formatters.formatFAQ(matched);
  }

  for (const faq of FAQS) {
    if (faq.keywords.some((kw) => lowerMsg.includes(kw))) {
      return formatters.formatFAQ(faq);
    }
  }

  if (primaryIntent.startsWith("faq_")) {
    const faqItem = FAQS.find((f) => f.keywords.some((kw) => lowerMsg.includes(kw))) || FAQS[0];
    return formatters.formatFAQ(faqItem);
  }

  // 11. Greetings & Thanks
  if (primaryIntent === "greeting") {
    return formatters.formatGreeting(user);
  }

  if (primaryIntent === "thanks") {
    return {
      reply: "You're very welcome! Feel free to ask about open complaints, ward rankings, Google Maps directions, or resolution SLAs anytime.",
      intent: "thanks",
      data: {
        suggestions: ["How many issues are open?", "Issues in Koramangala", "Average fix time"],
      },
    };
  }

  // 12. Intelligent Context-Grounded Fallback
  // Instead of a rigid error, synthesize an intelligent response with real-time municipal data
  try {
    const [liveStats, topCategory] = await Promise.all([
      queries.getStatusCounts({}),
      queries.getTopCategories({}, 1),
    ]);

    const topCatName = topCategory[0]?.label || "Road Damage & Potholes";
    const topCatCount = topCategory[0]?.count || 0;

    return {
      reply: `I can help you explore real-time civic operations across Bengaluru!\n\n` +
        `Currently, the city database records **${liveStats.total} total complaints**:\n` +
        `• 🟠 **${liveStats.open} Open issues** awaiting or under assignment\n` +
        `• 🔵 **${liveStats.inProgress} Active repairs** by field engineers\n` +
        `• ✅ **${liveStats.resolved} Successfully resolved** grievances\n\n` +
        `The most reported category right now is **${topCatName}** with **${topCatCount} complaints**.\n\n` +
        `You can ask me:\n` +
        `• *"How many potholes in Indiranagar?"*\n` +
        `• *"Show average fix time"* or *"Busiest ward right now"*\n` +
        `• *"Status of issue #12"* to inspect history and photos\n` +
        `• *"How do I file a complaint?"* for step-by-step guidance.`,
      intent: "smart_overview",
      data: {
        cardType: "status_bar",
        suggestions: [
          "How many issues are open?",
          "Which ward has the most complaints?",
          "Average fix time",
          "How to report an issue",
        ],
      },
    };
  } catch {
    return formatters.formatFallback();
  }
}

/**
 * Multi-provider LLM Enhancement (Gemini API & OpenAI)
 * strictly grounded in compact database snapshot. Never invent numbers.
 */
async function tryLLMEnhancement(message, liveStats, entities) {
  // 1. Check Gemini API key
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const prompt = `You are the CivicFix Municipal AI Assistant.
Answer the citizen's question strictly using this live data snapshot from the municipal database:
${JSON.stringify({ liveStats, entities })}
Never fabricate numbers, dates, or wards. Be helpful, concise, and friendly. Answer in crisp Markdown with emojis.
Citizen Question: "${message}"`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch {}
  }

  // 2. Check OpenAI API key
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const systemPrompt = `You are the CivicFix Municipal Assistant.
Answer the citizen's question strictly using this live data snapshot from the municipal database:
${JSON.stringify({ liveStats, entities })}
Never fabricate numbers, dates, or wards. If the data is not in the snapshot, state that politely. Be concise and friendly.`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          max_tokens: 350,
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return json.choices?.[0]?.message?.content?.trim() || null;
      }
    } catch {}
  }

  return null; // Gracefully fallback to deterministic reasoning engine
}
