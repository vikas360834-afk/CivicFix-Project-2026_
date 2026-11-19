/**
 * CivicFix Domain Knowledge Base
 * Categories, departments, workflows, FAQs, platform rules, and glossary.
 */

export const CATEGORIES = {
  ROAD: {
    label: "Road & Pavement",
    department: "Public Works Department",
    slaDays: 7,
    description: "Potholes, broken footpaths, damaged speed breakers, missing dividers, and road cave-ins.",
  },
  STREET_LIGHT: {
    label: "Street Light",
    department: "Electrical & Lighting Division",
    slaDays: 3,
    description: "Dead street lights, flickering bulbs, damaged lampposts, exposed wiring, and dark stretches.",
  },
  WATER: {
    label: "Water Supply & Drainage",
    department: "Water Supply & Sewerage Board",
    slaDays: 4,
    description: "Pipe bursts, drinking water shortages, open manholes, contaminated water, blocked storm drains.",
  },
  SANITATION: {
    label: "Sanitation & Garbage",
    department: "Sanitation & Waste Management Department",
    slaDays: 2,
    description: "Garbage overflow, missed doorstep collection, illegal waste dumping, dead animals, blocked sewage.",
  },
  ELECTRICITY: {
    label: "Electricity & Power",
    department: "City Electricity Supply Board",
    slaDays: 2,
    description: "Fallen live wires, sparking transformers, power outages, tilted electric poles, low hanging cables.",
  },
  PARK: {
    label: "Parks & Gardens",
    department: "Horticulture & Parks Division",
    slaDays: 10,
    description: "Broken playground equipment, fallen tree limbs, broken garden fences, dry lawns, unlit park paths.",
  },
  GAS: {
    label: "Gas & Pipeline",
    department: "City Gas Utility Department",
    slaDays: 1,
    description: "Gas leaks, pipeline construction trenches left open, damaged gas marker posts, gas odour.",
  },
  OTHER: {
    label: "Other Civic Issues",
    department: "City Administration & Municipal Council",
    slaDays: 7,
    description: "Abandoned vehicles, illegal encroachments, loud construction noise, collapsing hoardings.",
  },
};

export const DEPARTMENTS = [
  "Public Works Department",
  "Electrical & Lighting Division",
  "Water Supply & Sewerage Board",
  "Sanitation & Waste Management Department",
  "City Electricity Supply Board",
  "Horticulture & Parks Division",
  "City Gas Utility Department",
  "City Administration & Municipal Council",
];

export const WORKFLOW_STEPS = [
  {
    status: "PENDING_APPROVAL",
    label: "Pending Review",
    actor: "Citizen & Admin",
    description: "Citizen reports the issue with photo evidence and location. It remains in pending triage until verified by an Administrator.",
  },
  {
    status: "OPEN",
    label: "Approved & Public",
    actor: "Admin",
    description: "Administrator verifies legitimacy, confirms AI-suggested category/priority, and approves it onto the public feed and map.",
  },
  {
    status: "ASSIGNED",
    label: "Assigned to Ward Engineer",
    actor: "Admin & Engineer",
    description: "Admin assigns the approved issue to a specialized field engineer based on ward and department.",
  },
  {
    status: "IN_PROGRESS",
    label: "Work Started on Site",
    actor: "Ward Engineer",
    description: "Engineer arrives on site with crew and equipment and begins repair operations.",
  },
  {
    status: "RESOLVED",
    label: "Resolved & Verified",
    actor: "Ward Engineer",
    description: "Engineer completes work, writes a resolution note, attaches after-photo proof, and signs off. Citizen is notified.",
  },
  {
    status: "REJECTED",
    label: "Rejected",
    actor: "Admin",
    description: "Admin rejects duplicate, fraudulent, or out-of-jurisdiction issues with a required reason visible to the reporter.",
  },
];

export const FAQS = [
  {
    keywords: ["how to report", "file complaint", "submit issue", "report problem", "post grievance"],
    question: "How do I report a civic issue?",
    answer: "1. Log in with your Citizen account.\n2. Click '+ Report Issue' in the top navigation or right-click any spot on the Map.\n3. Add title, description, location, ward, and upload photo evidence.\n4. Submit! Our AI will classify the urgency and department, and an admin will review and approve it.",
  },
  {
    keywords: ["approval process", "why pending", "who approves", "pending approval"],
    question: "How does the approval process work?",
    answer: "To prevent spam and false reports, every new issue starts as 'Pending Approval'. A municipal Administrator reviews the evidence, confirms the category and priority, and approves it to the public feed and map. If invalid, it is rejected with a written explanation.",
  },
  {
    keywords: ["roles", "who uses", "three logins", "role difference"],
    question: "What are the roles in CivicFix?",
    answer: "CivicFix has 3 distinct roles:\n• **Citizen (USER)**: Reports issues, upvotes, comments, and tracks progress.\n• **Administrator (ADMIN)**: Verifies reports, approves or rejects, assigns tasks to engineers, and manages users.\n• **Engineer (ENGINEER)**: Receives work orders, updates repair status from In Progress to Resolved, and uploads after-fix photos.",
  },
  {
    keywords: ["photo rules", "evidence", "image upload", "camera", "after photo"],
    question: "What are the rules for uploading photos?",
    answer: "You can upload up to 5 photos per issue (JPG, PNG, WEBP, GIF, max 5MB each). Clear, well-lit photos showing the exact defect and surroundings help engineers locate and fix the problem faster. When engineers resolve an issue, they upload an after-repair photo as proof.",
  },
  {
    keywords: ["timeline", "how long", "sla", "turnaround", "resolution time"],
    question: "How long does it take to fix an issue?",
    answer: "Resolution times vary by urgency:\n• Gas leaks / live electrical emergencies: Under 24 hours.\n• Sanitation & street lights: 2 to 3 days.\n• Water supply & drainage: 3 to 4 days.\n• Road resurfacing & civil works: 7 to 10 days.\nYou can track live milestones on your issue's status timeline.",
  },
  {
    keywords: ["privacy", "personal data", "phone number", "who can see"],
    question: "How is my privacy protected?",
    answer: "Public feeds and maps only display the issue title, category, ward, and location description. Your phone number and email are strictly private and never displayed to guests or other citizens.",
  },
  {
    keywords: ["duplicate", "same issue", "already reported"],
    question: "What happens if an issue is reported twice?",
    answer: "The Admin panel features an automated duplicate detection warning for reports in the same category within ~100 meters in the last 14 days. Admins can merge or reject duplicates to keep the public feed clean.",
  },
  {
    keywords: ["upvote", "vote", "support"],
    question: "Why should I upvote an issue?",
    answer: "Upvoting signals community impact to city officials. Issues with high upvote counts automatically receive boosted priority in the administrative dispatch queue.",
  },
  {
    keywords: ["helpline numbers", "emergency helpline", "emergency numbers", "who to call", "helpline", "emergency contact", "emergency phone"],
    question: "What are the official municipal emergency helpline numbers?",
    answer: "Here are the 24x7 official emergency desk numbers for Bengaluru:\n• ⚡ **BESCOM Electricity Emergencies**: Call **1912**\n• 💧 **BWSSB Water & Sewage Helpline**: Call **1916**\n• 🏢 **BBMP Central Control Room**: Call **1533** / 080-22660000\n• 🚒 **Fire & Rescue Service**: Call **101**\n• 🚓 **Police / Ambulance**: Call **112**\n• 🚦 **Traffic Police Control**: Call **103** / 080-22943030\nFor municipal dispatch, you can also report on CivicFix with Critical priority.",
  },
  {
    keywords: ["target sla", "sla deadlines", "deadline for each department", "department sla", "how many days for each", "timeline for each", "resolution timeline"],
    question: "What are the target SLA deadlines for each department?",
    answer: "CivicFix enforces the following statutory Service Level Agreements (SLAs):\n• ⚡ **City Gas & Pipeline**: 1 day (24 hours)\n• 💡 **Street Lighting Division**: 3 days\n• 🧹 **Sanitation & Waste Management**: 2 days\n• 💧 **Water Supply & Sewerage Board**: 4 days\n• 🔌 **Electricity Supply Board**: 2 days\n• 🚧 **Public Works Department (PWD)**: 7 days\n• 🌳 **Horticulture & Parks Division**: 10 days\n• 🏢 **General Administration**: 7 days\nIf an issue exceeds its SLA, it is automatically flagged for Administrative Escalation.",
  },
  {
    keywords: ["live power wire", "wire is sparking", "sparking wire", "transformer spark", "power wire", "sparking electric", "sparking", "electric wire"],
    question: "What should I do if a live power wire is sparking?",
    answer: "⚠️ **DANGER - HIGH VOLTAGE SAFETY STEPS**:\n1. **Keep a safe distance**: Stay at least 10 meters (33 feet) away from the wire or pole.\n2. **Do not touch**: Never touch metal fences, wet pavement, or vehicles in contact with the wire.\n3. **Call BESCOM 1912 immediately**: Request an emergency feeder shutdown for your sector.\n4. **Report as Critical**: File an emergency report on CivicFix so all nearby residents and ward engineers are notified.",
  },
  {
    keywords: ["how does ai detect duplicate", "detect duplicate", "duplicate complaints", "duplicate detection", "detect duplicate grievance"],
    question: "How does AI detect duplicate complaints?",
    answer: "CivicFix uses dual automated detection algorithms:\n• **Geo-Proximity**: Issues submitted within a 100-meter radius are grouped.\n• **Category & Semantic NLP**: Issue descriptions are matched using NLP similarity scoring against open complaints reported in the last 14 days.\nWhen a potential duplicate is detected, administrators can link or merge it with the primary ticket to avoid redundant work orders.",
  },
  {
    keywords: ["field engineers update", "engineers update", "work order status", "engineer update", "update work order", "engineers receive and update", "receive and update"],
    question: "How do field engineers receive and update work orders?",
    answer: "Assigned field engineers log into their Engineer Panel and can:\n1. Review assigned tickets sorted by SLA urgency and ward.\n2. Click 'Start Work' to transition status to **IN_PROGRESS**.\n3. Arrive on-site, complete physical repairs, and upload after-fix photo evidence.\n4. Add a resolution note and mark the ticket **RESOLVED**.\nThe citizen reporter receives an instant notification of completion.",
  },
  {
    keywords: ["life-safety", "urgent life-safety hazard", "report urgent", "safety hazard", "urgent hazard"],
    question: "How do I report an urgent life-safety hazard?",
    answer: "To report an urgent hazard (open manhole, cave-in, sparking transformer, gas leak):\n1. Click '+ Report Issue' or click on the City Map.\n2. In the priority dropdown, select **'Critical'**.\n3. Upload clear photos of the hazard and confirm the GPS coordinates.\n4. Critical issues trigger immediate top-of-queue alerts on the Admin dispatch panel and notify the on-call ward engineer.",
  },
];

export const GLOSSARY = {
  "ward": "Administrative territorial division of the city managed by a dedicated municipal ward office.",
  "sla": "Service Level Agreement — the target deadline by which a municipal department aims to resolve a reported grievance.",
  "ai triage": "Automated machine learning classification of issue text to determine category, priority level, and municipal routing department.",
  "status history": "An immutable audit trail recording every state change, timestamp, author, and note from creation to resolution.",
};
