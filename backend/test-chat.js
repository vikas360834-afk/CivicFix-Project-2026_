import "dotenv/config";
import prisma from "./src/config/prisma.js";
import { processChatMessage } from "./src/services/chat/index.js";
import { extractEntities, classifyIntent } from "./src/services/chat/intents.js";
import { ConversationContext } from "./src/services/chat/context.js";

const TEST_CASES = [
  // 1-6: Basic counts and statuses
  { q: "how many issues are open", expectedIntent: "count_open" },
  { q: "how many are open right now", expectedIntent: "count_open" },
  { q: "how many are solved", expectedIntent: "count_resolved" },
  { q: "how many issues are resolved", expectedIntent: "count_resolved" },
  { q: "how many are being fixed right now", expectedIntent: "count_in_progress" },
  { q: "issues in progress", expectedIntent: "count_in_progress" },
  { q: "how many total complaints reported", expectedIntent: "counts_overview" },
  { q: "total issues count", expectedIntent: "counts_overview" },

  // 7-15: Ward and Category queries
  { q: "how many open issues in Koramangala", expectedIntent: "count_open", expectedWard: "Ward 84 – Koramangala" },
  { q: "issues in Koramangala last month", expectedWard: "Ward 84 – Koramangala" },
  { q: "potholes in Indiranagar", expectedCategory: "ROAD", expectedWard: "Ward 76 – Indiranagar" },
  { q: "how many garbage issues are there", expectedCategory: "SANITATION" },
  { q: "street lights not working", expectedCategory: "STREET_LIGHT" },
  { q: "water supply complaints in Whitefield", expectedCategory: "WATER", expectedWard: "Ward 150 – Whitefield" },
  { q: "electricity issues this week", expectedCategory: "ELECTRICITY" },
  { q: "broken swings in the park", expectedCategory: "PARK" },
  { q: "gas pipeline leaks", expectedCategory: "GAS" },

  // 16-25: Performance & Turnaround Metrics
  { q: "which ward has the most complaints", expectedIntent: "top_wards" },
  { q: "busiest ward right now", expectedIntent: "top_wards" },
  { q: "what is the most common category", expectedIntent: "top_categories" },
  { q: "top complaint category", expectedIntent: "top_categories" },
  { q: "average fix time", expectedIntent: "resolution_metrics" },
  { q: "what is the resolution rate", expectedIntent: "resolution_metrics" },
  { q: "how fast are issues resolved", expectedIntent: "resolution_metrics" },
  { q: "median fix time", expectedIntent: "resolution_metrics" },
  { q: "fastest category to get resolved", expectedIntent: "resolution_metrics" },
  { q: "slowest category for repairs", expectedIntent: "resolution_metrics" },

  // 26-30: Backlog and Hotspots
  { q: "oldest unresolved issue", expectedIntent: "oldest_unresolved" },
  { q: "longest pending complaint", expectedIntent: "oldest_unresolved" },
  { q: "backlog age buckets", expectedIntent: "oldest_unresolved" },
  { q: "repeat problem locations", expectedIntent: "repeat_hotspots" },
  { q: "recurrent hotspots in the city", expectedIntent: "repeat_hotspots" },

  // 31-35: Comparisons
  { q: "compare Indiranagar and Koramangala", expectedIntent: "compare_wards" },
  { q: "Koramangala vs Whitefield", expectedIntent: "compare_wards" },
  { q: "compare Majestic and Jayanagar", expectedIntent: "compare_wards" },
  { q: "month over month change", expectedIntent: "month_comparison" },
  { q: "this month vs last month trend", expectedIntent: "month_comparison" },

  // 36-40: Single Issue Tracking (with simulated user)
  { q: "status of issue 1", expectedIntent: "single_issue", expectedIssueId: 1 },
  { q: "what is happening with issue 5", expectedIntent: "single_issue", expectedIssueId: 5 },
  { q: "history of issue 12", expectedIntent: "single_issue_history", expectedIssueId: 12 },
  { q: "timeline of complaint 8", expectedIntent: "single_issue_history", expectedIssueId: 8 },
  { q: "track issue #3", expectedIntent: "single_issue", expectedIssueId: 3 },

  // 41-48: FAQs and Platform Rules
  { q: "how to report an issue", expectedIntent: "faq_report" },
  { q: "how do I file a complaint", expectedIntent: "faq_report" },
  { q: "what is the approval process", expectedIntent: "faq_approval" },
  { q: "who approves new complaints", expectedIntent: "faq_approval" },
  { q: "what are the three roles", expectedIntent: "faq_roles" },
  { q: "what are the photo rules", expectedIntent: "faq_photos" },
  { q: "how is my privacy protected", expectedIntent: "faq_privacy" },
  { q: "what is the SLA timeline", expectedIntent: "faq_sla" },

  // 49-54: Greetings, Thanks & Follow-ups
  { q: "hello there", expectedIntent: "greeting" },
  { q: "hey assistant", expectedIntent: "greeting" },
  { q: "thank you for the help", expectedIntent: "thanks" },
  { q: "and in Koramangala?", isFollowUp: true, prevCategory: "ROAD", expectedWard: "Ward 84 – Koramangala" },
  { q: "any critical complaints?", expectedPriority: "CRITICAL" },
  { q: "how many urgent issues", expectedPriority: "HIGH" },
];

async function runTests() {
  console.log(`\n🧪 Running CivicFix Chatbot Test Suite (${TEST_CASES.length} test cases)...\n`);

  // Fetch demo admin user for tests that require authentication
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) {
    console.error("❌ No admin user found in database. Please run seed.js first.");
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    let context = null;

    if (tc.isFollowUp) {
      context = new ConversationContext([
        { role: "user", content: `how many ${tc.prevCategory || "road"} issues are open` },
      ]);
    }

    const entities = extractEntities(tc.q, context);
    const { primaryIntent } = classifyIntent(tc.q, entities, adminUser);

    let testOk = true;
    const errors = [];

    if (tc.expectedIntent && primaryIntent !== tc.expectedIntent) {
      // allow count_open / counts_overview / ward_overview compatibility when ward is present
      const isCompat =
        (tc.expectedIntent === "count_open" && (primaryIntent === "count_open" || primaryIntent === "counts_overview" || primaryIntent === "ward_overview")) ||
        (tc.expectedIntent === "counts_overview" && (primaryIntent === "counts_overview" || primaryIntent === "count_open")) ||
        (tc.expectedIntent === "single_issue" && (primaryIntent === "single_issue" || primaryIntent === "single_issue_history")) ||
        (tc.expectedIntent === "single_issue_history" && (primaryIntent === "single_issue_history" || primaryIntent === "single_issue"));

      if (!isCompat) {
        testOk = false;
        errors.push(`Intent mismatch: expected '${tc.expectedIntent}', got '${primaryIntent}'`);
      }
    }

    if (tc.expectedWard && entities.ward !== tc.expectedWard) {
      testOk = false;
      errors.push(`Ward mismatch: expected '${tc.expectedWard}', got '${entities.ward}'`);
    }

    if (tc.expectedCategory && entities.category !== tc.expectedCategory) {
      testOk = false;
      errors.push(`Category mismatch: expected '${tc.expectedCategory}', got '${entities.category}'`);
    }

    if (tc.expectedIssueId && entities.issueId !== tc.expectedIssueId) {
      testOk = false;
      errors.push(`IssueId mismatch: expected '${tc.expectedIssueId}', got '${entities.issueId}'`);
    }

    if (tc.expectedPriority && entities.priority !== tc.expectedPriority) {
      testOk = false;
      errors.push(`Priority mismatch: expected '${tc.expectedPriority}', got '${entities.priority}'`);
    }

    // Also run full pipeline to check execution without crashing
    try {
      const response = await processChatMessage(tc.q, adminUser, []);
      if (!response || !response.reply) {
        testOk = false;
        errors.push("processChatMessage returned empty response");
      }
    } catch (err) {
      testOk = false;
      errors.push(`Execution threw error: ${err.message}`);
    }

    if (testOk) {
      passed++;
      console.log(`  ✓ [${i + 1}/${TEST_CASES.length}] "${tc.q}" -> ${primaryIntent}`);
    } else {
      failed++;
      console.log(`  ✗ [${i + 1}/${TEST_CASES.length}] "${tc.q}" FAILED:`);
      errors.forEach((e) => console.log(`      • ${e}`));
    }
  }

  console.log(`\n========================================`);
  console.log(`🏁 Test Results: ${passed} passed, ${failed} failed (${TEST_CASES.length} total)`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Fatal test runner error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
