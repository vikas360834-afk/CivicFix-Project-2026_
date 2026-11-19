import { CATEGORIES, FAQS, WORKFLOW_STEPS } from "./knowledge.js";

/**
 * Format reply text and UI cards for Chat responses
 */

export function formatGreeting(user) {
  const roleGreeting = user
    ? `Welcome back, **${user.name}** (${user.role})! 👋`
    : "Hello! 👋 I'm the **CivicFix AI Assistant**, reading real-time municipal data.";

  const suggestions = user?.role === "ADMIN"
    ? ["Pending approval count", "Which ward has the most complaints?", "Average fix time", "Backlog age"]
    : user?.role === "ENGINEER"
    ? ["My assigned work", "Issues being fixed right now", "Average fix time", "Recent complaints"]
    : ["How many issues are open?", "Issues in Koramangala", "How many are solved?", "How to report an issue?"];

  return {
    reply: `${roleGreeting}\n\nAsk me about:\n• **Live counts** of open, in-progress, and resolved issues (city-wide or by ward/category)\n• **Single issue tracking** and history (e.g. *"history of issue 12"*)\n• **Analytics** like average fix time, resolution rate, top hotspots, or comparisons\n• **Platform questions** on how reporting, approvals, and roles work.\n\nWhat would you like to check?`,
    intent: "greeting",
    data: {
      cardType: "quick_actions",
      suggestions,
    },
  };
}

export function formatStatusCounts(counts, entities, labelPrefix = "") {
  const periodText = entities.dateRange ? ` in **${entities.dateRange.label}**` : "";
  const wardText = entities.ward ? ` in **${entities.ward}**` : "";
  const catText = entities.category ? ` for **${CATEGORIES[entities.category]?.label || entities.category}**` : "";
  const scopeText = `${labelPrefix}${wardText}${catText}${periodText}` || " city-wide";

  const total = counts.total || 0;
  const active = (counts.open || 0) + (counts.assigned || 0) + (counts.inProgress || 0);

  const reply = `Here are the live statistics${scopeText}:\n` +
    `• 🟠 **Open**: ${counts.open}\n` +
    `• 🟣 **Assigned**: ${counts.assigned}\n` +
    `• 🔵 **Being Fixed (In Progress)**: ${counts.inProgress}\n` +
    `• ✅ **Solved (Resolved)**: ${counts.resolved}\n` +
    `• 📊 **Total Reported**: ${total}\n\n` +
    `Active workload is **${active}** issues under repair or pending assignment.`;

  return {
    reply,
    intent: "stats",
    data: {
      cardType: "status_bar",
      scope: scopeText.trim(),
      counts: {
        open: counts.open,
        assigned: counts.assigned,
        inProgress: counts.inProgress,
        resolved: counts.resolved,
        total: counts.total,
        pending: counts.pending,
        rejected: counts.rejected,
      },
      suggestions: entities.ward
        ? ["Most common category there", "Average fix time", "Any critical complaints?"]
        : ["Issues in Koramangala", "Which ward has the most complaints?", "Resolution rate"],
    },
  };
}

export function formatSingleIssue(issue, isHistory = false) {
  if (!issue) {
    return {
      reply: "I couldn't locate that issue ID in the database. Please double check the number.",
      intent: "single_issue",
      data: null,
    };
  }

  if (issue.restricted) {
    return {
      reply: "🔒 This issue record is private or awaiting administrative approval. Please log in with the appropriate account to view its details.",
      intent: "privacy_restricted",
      data: null,
    };
  }

  const statusIcons = {
    PENDING_APPROVAL: "🟣",
    OPEN: "🟠",
    ASSIGNED: "🟣",
    IN_PROGRESS: "🔵",
    RESOLVED: "✅",
    REJECTED: "❌",
  };

  const icon = statusIcons[issue.status] || "⚪";
  let reply = `${icon} **Issue #${issue.id}**: **${issue.title}**\n` +
    `• **Status**: ${issue.status.replace("_", " ")}\n` +
    `• **Category**: ${CATEGORIES[issue.category]?.label || issue.category}\n` +
    `• **Priority**: ${issue.priority}\n` +
    `• **Ward & Location**: ${issue.ward || "City"} — ${issue.location}\n` +
    `• **Upvotes**: 👍 ${issue.upvotes}\n` +
    `• **Reported**: ${new Date(issue.createdAt).toLocaleDateString("en-IN")}\n`;

  if (issue.assignedTo) {
    reply += `• **Assigned Engineer**: ${issue.assignedTo.name} (${issue.assignedTo.department || "Field Team"})\n`;
  }

  if (issue.resolvedAt) {
    reply += `• **Resolved On**: ${new Date(issue.resolvedAt).toLocaleDateString("en-IN")}\n`;
  }

  if (issue.resolutionNote) {
    reply += `• **Resolution Note**: _"${issue.resolutionNote}"_\n`;
  }

  if (issue.rejectionReason) {
    reply += `• **Rejection Reason**: _"${issue.rejectionReason}"_\n`;
  }

  if (issue.statusHistory && issue.statusHistory.length > 0) {
    reply += `\n**Status Timeline (${issue.statusHistory.length} events)**:\n`;
    issue.statusHistory.forEach((h, idx) => {
      const date = new Date(h.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const actor = h.changedBy?.name ? ` by ${h.changedBy.name}` : "";
      reply += `${idx + 1}. [${date}] **${h.toStatus.replace("_", " ")}**${actor}${h.note ? `: ${h.note}` : ""}\n`;
    });
  }

  return {
    reply,
    intent: isHistory ? "single_issue_history" : "single_issue",
    data: {
      cardType: "issue_timeline",
      issue: {
        id: issue.id,
        title: issue.title,
        status: issue.status,
        category: issue.category,
        priority: issue.priority,
        ward: issue.ward,
        location: issue.location,
        upvotes: issue.upvotes,
        createdAt: issue.createdAt,
        resolvedAt: issue.resolvedAt,
        resolutionNote: issue.resolutionNote,
        rejectionReason: issue.rejectionReason,
        assignedTo: issue.assignedTo?.name,
        history: issue.statusHistory?.map((h) => ({
          status: h.toStatus,
          author: h.changedBy?.name,
          date: h.createdAt,
          note: h.note,
        })),
      },
      suggestions: ["How many open issues?", "Backlog age", "Average fix time"],
    },
  };
}

export function formatResolutionMetrics(metrics, entities) {
  const scope = entities.ward ? ` in **${entities.ward}**` : entities.category ? ` for **${entities.category}**` : " overall";

  let reply = `⚡ **Resolution Performance${scope}**:\n` +
    `• **Resolution Rate**: **${metrics.rate}%** (${metrics.resolvedCount} of ${metrics.total} resolved)\n` +
    `• **Average Fix Time**: **${metrics.avgDays} days**\n` +
    `• **Median Fix Time**: **${metrics.medianDays} days**\n`;

  if (metrics.fastestCategory) {
    reply += `• **Fastest Category**: ${CATEGORIES[metrics.fastestCategory.category]?.label || metrics.fastestCategory.category} (~${metrics.fastestCategory.avgDays} days)\n`;
  }
  if (metrics.slowestCategory) {
    reply += `• **Slowest Category**: ${CATEGORIES[metrics.slowestCategory.category]?.label || metrics.slowestCategory.category} (~${metrics.slowestCategory.avgDays} days)\n`;
  }

  return {
    reply,
    intent: "resolution_metrics",
    data: {
      cardType: "resolution_kpi",
      metrics,
      suggestions: ["Which ward has the most complaints?", "Oldest unresolved issue", "Compare Indiranagar and Koramangala"],
    },
  };
}

export function formatTopWards(wards, entities = {}) {
  if (!wards.length) {
    return { reply: "No ward activity recorded yet.", intent: "top_wards" };
  }

  const categoryLabel = entities.category
    ? (CATEGORIES[entities.category]?.label || entities.category) + " "
    : "";
  const reply = `📍 **Top Areas with Most ${categoryLabel}Reports**:\n` +
    wards.map((w, idx) => `${idx + 1}. **${w.ward}** — ${w.count} reported issues`).join("\n");

  return {
    reply,
    intent: "top_wards",
    data: {
      cardType: "ward_breakdown",
      wards,
      suggestions: wards[0] ? [`Issues in ${wards[0].ward}`, "Average fix time", "Top category"] : [],
    },
  };
}

export function formatDepartmentOverview(departments) {
  if (!departments.length) {
    return { reply: "No department metrics recorded.", intent: "department_performance" };
  }

  const topPending = departments[0];
  const reply = `🏢 **Municipal Department Performance & Pending Issues**:\n` +
    `• **${topPending.name}** has the most pending issues (**${topPending.pending} pending**, ${topPending.resolved} resolved).\n\n` +
    `**Full Breakdown**:\n` +
    departments.map((d, i) => `${i + 1}. **${d.name}**: ${d.pending} pending, ${d.inProgress} in progress, ${d.resolved} resolved (${d.total} total)`).join("\n");

  return {
    reply,
    intent: "department_performance",
    data: {
      cardType: "departments",
      departments,
      suggestions: ["Average fix time", "How many issues are open?", "Top category"],
    },
  };
}

export function formatTopCategories(categories, entities) {
  if (!categories.length) {
    return { reply: "No category reports found for this filter.", intent: "top_categories" };
  }

  const scope = entities.ward ? ` in **${entities.ward}**` : " city-wide";
  const reply = `🗂️ **Most Common Complaint Categories${scope}**:\n` +
    categories.map((c, idx) => {
      const info = CATEGORIES[c.category];
      return `${idx + 1}. **${info?.label || c.category}** — ${c.count} complaints`;
    }).join("\n");

  return {
    reply,
    intent: "top_categories",
    data: {
      cardType: "category_breakdown",
      categories: categories.map((c) => ({
        category: c.category,
        label: CATEGORIES[c.category]?.label || c.category,
        count: c.count,
      })),
      suggestions: ["Average fix time", "Which ward has the most complaints?", "How many issues are open?"],
    },
  };
}

export function formatOldestUnresolved(oldest) {
  if (!oldest) {
    return {
      reply: "🎉 Great news! There are currently no unresolved issues matching this criteria.",
      intent: "oldest_unresolved",
    };
  }

  const reply = `⚠️ **Oldest Unresolved Complaint**:\n` +
    `• **Issue #${oldest.id}**: "${oldest.title}"\n` +
    `• **Open for**: **${oldest.ageDays} days** (reported ${new Date(oldest.createdAt).toLocaleDateString("en-IN")})\n` +
    `• **Status**: ${oldest.status} · **Priority**: ${oldest.priority}\n` +
    `• **Location**: ${oldest.location} (${oldest.ward || "Unassigned"})\n` +
    (oldest.assignedEngineer ? `• **Assigned to**: ${oldest.assignedEngineer}\n` : "");

  return {
    reply,
    intent: "oldest_unresolved",
    data: {
      cardType: "oldest_issue",
      issue: oldest,
      suggestions: [`Status of issue ${oldest.id}`, "Backlog age buckets", "Average fix time"],
    },
  };
}

export function formatBacklogBuckets(buckets) {
  const reply = `⏳ **Active Backlog Age Breakdown (${buckets.total} open/in-progress issues)**:\n` +
    `• 🟢 **Under 7 days**: ${buckets.under7Days} issues\n` +
    `• 🟡 **7 to 30 days**: ${buckets.days7to30} issues\n` +
    `• 🟠 **30 to 90 days**: ${buckets.days30to90} issues\n` +
    `• 🔴 **Over 90 days**: ${buckets.over90Days} issues`;

  return {
    reply,
    intent: "backlog_buckets",
    data: {
      cardType: "backlog_buckets",
      buckets,
      suggestions: ["Oldest unresolved issue", "Resolution rate", "Which ward has the most complaints?"],
    },
  };
}

export function formatWardComparison(comparison) {
  const { wardA, wardB } = comparison;
  const reply = `⚖️ **Ward Comparison: ${wardA.name} vs. ${wardB.name}**\n\n` +
    `📍 **${wardA.name}**:\n` +
    `• Total: ${wardA.total} | Open: ${wardA.open} | Being Fixed: ${wardA.inProgress} | Solved: ${wardA.resolved}\n` +
    `• Top Issue Type: ${CATEGORIES[wardA.topCategory]?.label || wardA.topCategory}\n\n` +
    `📍 **${wardB.name}**:\n` +
    `• Total: ${wardB.total} | Open: ${wardB.open} | Being Fixed: ${wardB.inProgress} | Solved: ${wardB.resolved}\n` +
    `• Top Issue Type: ${CATEGORIES[wardB.topCategory]?.label || wardB.topCategory}`;

  return {
    reply,
    intent: "compare_wards",
    data: {
      cardType: "comparison",
      comparison,
      suggestions: [`Issues in ${wardA.name}`, `Issues in ${wardB.name}`, "Average fix time"],
    },
  };
}

export function formatMonthlyTrend(trend) {
  const { thisMonth, lastMonth, momChangePercent } = trend;
  const direction = momChangePercent > 0 ? "📈 increase" : momChangePercent < 0 ? "📉 decrease" : "remained steady";
  const reply = `📅 **Month-over-Month Grievance Trend**:\n` +
    `• **${thisMonth.name}**: ${thisMonth.reported} complaints reported, ${thisMonth.resolved} resolved\n` +
    `• **${lastMonth.name}**: ${lastMonth.reported} complaints reported, ${lastMonth.resolved} resolved\n` +
    `• **Monthly Velocity**: ${Math.abs(momChangePercent)}% ${direction} compared to last month.`;

  return {
    reply,
    intent: "month_comparison",
    data: {
      cardType: "trend_comparison",
      trend,
      suggestions: ["Average fix time", "Top category this month", "Backlog age"],
    },
  };
}

export function formatFAQ(faqItem) {
  return {
    reply: `💡 **${faqItem.question}**\n\n${faqItem.answer}`,
    intent: "faq",
    data: {
      cardType: "faq",
      suggestions: ["How does approval work?", "Who are the engineers?", "How many open issues?"],
    },
  };
}

export function formatFallback(suggestions = null) {
  const defaultSuggestions = [
    "How many issues are open?",
    "How many are solved?",
    "Issues in Koramangala",
    "Average fix time",
    "Which ward has the most complaints?",
  ];

  return {
    reply: "I'm not completely certain how to answer that specific query. You can ask me about live complaint counts (open, in-progress, solved), ward statistics, average fix time, a specific issue ID (e.g. *status of issue 5*), or platform rules.",
    intent: "fallback",
    data: {
      cardType: "suggestions",
      suggestions: suggestions || defaultSuggestions,
    },
  };
}
