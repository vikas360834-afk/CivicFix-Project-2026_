import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "./src/config/prisma.js";
import { classifyIssue } from "./src/services/ai.service.js";

/* ------------------------------------------------------------------ */
/* Demo logins (keep these stable)                                    */
/* ------------------------------------------------------------------ */
const DEMO_USERS = [
  {
    name: "Admin Officer",
    email: "admin@civicfix.in",
    password: "admin123",
    role: "ADMIN",
    ward: "Ward 42 – Majestic",
    department: "City Administration",
  },
  {
    name: "Engineer Suresh",
    email: "engineer@civicfix.in",
    password: "engineer123",
    role: "ENGINEER",
    ward: "Ward 84 – Koramangala",
    department: "Roads & Infrastructure",
  },
  {
    name: "Citizen User",
    email: "user@civicfix.in",
    password: "user123",
    role: "USER",
    ward: "Ward 76 – Indiranagar",
    department: null,
  },
  // Additional ward engineers
  {
    name: "Eng. Rajesh Rao",
    email: "engineer.water@civicfix.in",
    password: "engineer123",
    role: "ENGINEER",
    ward: "Ward 84 – Koramangala",
    department: "Water Supply & Drainage",
  },
  {
    name: "Eng. Deepa Hegde",
    email: "engineer.sanitation@civicfix.in",
    password: "engineer123",
    role: "ENGINEER",
    ward: "Ward 76 – Indiranagar",
    department: "Sanitation & Waste Management",
  },
  {
    name: "Eng. Kiran Kumar",
    email: "engineer.electric@civicfix.in",
    password: "engineer123",
    role: "ENGINEER",
    ward: "Ward 150 – Whitefield",
    department: "Electrical & Lighting",
  },
  {
    name: "Eng. Priya Nair",
    email: "engineer.pwd@civicfix.in",
    password: "engineer123",
    role: "ENGINEER",
    ward: "Ward 163 – Jayanagar",
    department: "Public Works Department",
  },
];

const FIRST = ["Anita","Rahul","Meena","Kiran","Priya","Arjun","Sneha","Vikas","Naveen","Manish","Deepa","Ravi","Kavya","Suresh","Pooja","Nithin","Shreya","Girish","Asha","Manoj","Divya","Sandeep","Lakshmi","Prakash","Neha","Harish","Swathi","Gopal","Rekha","Umesh","Anjali","Tarun","Bhavana","Mohan","Preeti","Sanjay","Roopa","Ashwin","Shweta","Nagaraj"];
const LAST = ["Shetty","Verma","Joshi","Patil","Rao","Gowda","Iyer","Nair","Reddy","Kumar","Sharma","Murthy","Hegde","Bhat","Naik","Pillai","Menon","Das","Kulkarni","Choudhary"];

/* Real Bengaluru areas — approximate centre + the streets around it */
const AREAS = [
  { ward: "Ward 42 – Majestic", lat: 12.9762, lng: 77.5746, places: ["City Market Road", "Chickpet Main Road", "Sampige Road", "Kaveri Building"] },
  { ward: "Ward 84 – Koramangala", lat: 12.9352, lng: 77.6245, places: ["5th Block Koramangala", "Sony World Signal", "Ejipura Main Road", "Jyoti Nivas College Road"] },
  { ward: "Ward 76 – Indiranagar", lat: 12.9719, lng: 77.6412, places: ["100 Feet Road", "CMH Road", "Defence Colony", "Halasuru Metro"] },
  { ward: "Ward 150 – Whitefield", lat: 12.9698, lng: 77.7500, places: ["ITPL Main Road", "Hoodi Circle", "BEML Layout", "Sri Sathya Sai Hospital Road"] },
  { ward: "Ward 163 – Jayanagar", lat: 12.9250, lng: 77.5938, places: ["4th Block Jayanagar", "South End Circle", "Ashoka Pillar Road", "Basavanagudi Fort Road"] },
  { ward: "Ward 4 – Yelahanka", lat: 13.1005, lng: 77.5963, places: ["New Airport Road", "Akkalahalli", "Hunasamaranahalli", "Doddabommasandra"] },
  { ward: "Ward 27 – Hebbal", lat: 13.0358, lng: 77.5970, places: ["Outer Ring Road", "Manyata Tech Park Road", "Bel Layout", "Ganganagar"] },
  { ward: "Ward 178 – Banashankari", lat: 12.9250, lng: 77.5460, places: ["2nd Stage Banashankari", "BDA Complex", "Kumaraswamy Layout", "Sunkadakatte"] },
  { ward: "Ward 66 – Rajajinagar", lat: 12.9910, lng: 77.5500, places: ["13th Cross", "Dr. Rajkumar Road", "Basaveshwara Nagar", "Rajajinagar Industrial Area"] },
  { ward: "Ward 152 – Marathahalli", lat: 12.9591, lng: 77.6974, places: ["Outer Ring Road", "Kadugodi Main Road", "SF Road", "Muneshwara Nagar"] },
  { ward: "Ward 38 – Malleshwaram", lat: 13.0050, lng: 77.5690, places: ["8th Cross", "Sankey Road", "Chord Road", "Rajaji Nagar Depot"] },
  { ward: "Ward 180 – Electronic City", lat: 12.8452, lng: 77.6602, places: ["Hosur Road", "Phase 1", "Neeladri Road", "Konappana Agrahara"] },
];

/* Realistic complaint templates, keyed by category */
const TEMPLATES = {
  ROAD: [
    ["Large pothole near the bus stop", "A deep pothole on the main road near the bus stop caused a two-wheeler accident last evening. Vehicles swerve dangerously to avoid it."],
    ["Road dug up and left unfinished", "The contractor dug up the road for pipe work and left it open for weeks. Two-wheelers keep slipping on the loose gravel."],
    ["Broken footpath slabs", "The footpath slabs are loose and tilted. Elderly residents and wheelchair users cannot use the pavement at all."],
    ["Damaged speed breaker", "The speed breaker has worn down to its iron rods. Cars scrape badly and two-wheelers get punctures here."],
    ["Crater on the service road", "A crater has formed on the service road after the rains. It fills with water and hides the depth from drivers."],
  ],
  STREET_LIGHT: [
    ["Street light not working for 2 weeks", "The street light pole opposite the community hall has been dark for two weeks. The stretch is completely unsafe at night."],
    ["No street lighting on the main stretch", "The entire stretch between the flyover and the colony gate has no functional lights. Night driving is risky."],
    ["Street light pole leaning dangerously", "A pole near the bus depot is leaning after a vehicle hit it. It could fall on pedestrians any time."],
    ["Lights flickering all night", "The street lights here flicker through the night and there is constant transformer noise in the houses nearby."],
  ],
  WATER: [
    ["Water pipe leakage flooding the lane", "A supply pipe near house no 45 is leaking continuously and flooding the lane. There is a risk of contamination."],
    ["Open manhole on the school road", "An open manhole without a cover sits on the road opposite the primary school. Extremely dangerous for children."],
    ["Sewage overflow on residential street", "Sewage is overflowing from the drain and the smell is unbearable. Stagnant water is breeding mosquitoes."],
    ["No drinking water supply for 4 days", "The public tap has been dry for four days. The tanker has not arrived in the ward and families are struggling."],
    ["Drainage blocked, water stagnation", "The storm water drain is choked with silt and waste. Even light rain floods the entire junction."],
  ],
  SANITATION: [
    ["Garbage dumping near market entrance", "Garbage is dumped illegally near the market entrance. Rotten waste and stray animals are a serious health hazard."],
    ["Garbage not collected for a week", "The bin has been overflowing for a week. Waste is scattered on the road and it stinks in this summer heat."],
    ["Sewage tank overflowing", "The community sewage tank is overflowing onto the footpath. Passers-by are forced to walk on the road."],
    ["Dead animal on the main road", "A dead animal has been lying on the main road for two days. It is a serious hygiene risk for the surrounding shops."],
  ],
  ELECTRICITY: [
    ["Broken transformer sparking at night", "The transformer near the vegetable market is sparking at night and there are voltage fluctuations across the neighbourhood."],
    ["Electric pole with exposed wires", "A low-hanging electric pole has exposed wires near the school gate. Children pass under it every morning."],
    ["Street transformer keeps tripping", "The local transformer trips every evening during peak hours. Homes and shops lose power for hours."],
    ["Fallen live wire on the footpath", "A live wire snapped during last night's storm and is lying on the footpath. It needs urgent isolation."],
  ],
  PARK: [
    ["Playground swings broken", "The swings and see-saw in the children's park are broken with sharp edges. Kids still play on them and it is risky."],
    ["Fallen tree branch blocking the footpath", "A large branch fell during the storm and is blocking the entire footpath beside the park."],
    ["Park fence damaged, stray dumping", "The park boundary fence is broken and people dump construction waste inside the garden every night."],
    ["Irrigation and lighting in the park not working", "The park lights are dead and the sprinklers are not running. The grass has dried up completely."],
  ],
  GAS: [
    ["Gas pipeline work left open", "The gas pipeline trench has been left open with loose soil for days. Two-wheelers are skidding at the corner."],
    ["Smell of gas near the junction", "Residents report a faint gas smell near the junction since morning. Please send a crew with a detector urgently."],
    ["Gas pipeline marker damaged", "The gas pipeline marker post has been knocked over by a vehicle and the route is now unmarked for future work."],
    ["Pipeline excavation blocking the road", "The excavation for the gas line has reduced the road to a single lane. Peak-hour traffic is badly affected."],
  ],
  OTHER: [
    ["Abandoned vehicle on the road", "An abandoned vehicle has been parked on the road for months, reducing the carriageway and blocking visibility."],
    ["Encroachment on the footpath", "Shops have encroached the entire footpath forcing pedestrians onto a busy road with heavy traffic."],
    ["Noise from construction at night", "Night construction work is going on past midnight. Babies and elderly residents cannot sleep."],
    ["Illegal hoarding falling apart", "A large hoarding is rusted and its panels are falling onto the road during strong winds."],
  ],
};

const LANDMARKS = [
  "near the bus stop",
  "opposite the water tank",
  "beside the BDA complex",
  "near the vegetable market",
  "next to the government school",
  "behind the bus shelter",
  "near the temple junction",
  "at the colony entrance",
  "close to the metro pillar",
  "near the public library",
];

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

const TARGET_USERS = 50;
const TARGET_ISSUES = 140;

async function main() {
  console.log("🌱 Seeding CivicFix (realistic dataset with 3 roles: USER, ADMIN, ENGINEER)…");

  // wipe everything in correct dependency order
  await prisma.authLog.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.issueStatusHistory.deleteMany();
  await prisma.issueImage.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.user.deleteMany();

  // reset AUTOINCREMENT counters so demo ids stay 1..N after re-seeds (SQLite)
  try {
    await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence;");
  } catch {
    /* table may not exist yet on first push — harmless */
  }

  /* ---------- demo users ---------- */
  const users = { ADMIN: [], ENGINEER: [], USER: [] };

  for (const u of DEMO_USERS) {
    const created = await prisma.user.create({
      data: {
        ...u,
        password: await bcrypt.hash(u.password, 10),
        phone: `+91 98${String(10000000 + rnd(89999999))}`,
      },
    });
    users[created.role].push(created);
  }

  // Extra citizen users
  const hashedUserPass = await bcrypt.hash("user123", 10);
  const extraUsers = TARGET_USERS - DEMO_USERS.length;
  for (let i = 0; i < extraUsers; i++) {
    const area = pick(AREAS);
    const created = await prisma.user.create({
      data: {
        name: `${pick(FIRST)} ${pick(LAST)}`,
        email: `citizen${String(i + 1).padStart(3, "0")}@civicfix.in`,
        password: hashedUserPass,
        role: "USER",
        ward: area.ward,
        phone: `+91 9${rnd(9)}${String(10000000 + rnd(89999999)).slice(0, 8)}`,
      },
    });
    users.USER.push(created);
  }

  console.log(`   users: ${users.ADMIN.length} admin, ${users.ENGINEER.length} engineers, ${users.USER.length} users`);

  /* ---------- issues ---------- */
  const categories = Object.keys(TEMPLATES);
  const adminUser = users.ADMIN[0];

  for (let i = 0; i < TARGET_ISSUES; i++) {
    const category = categories[i % categories.length];
    const [title, description] = pick(TEMPLATES[category]);
    const area = pick(AREAS);
    const place = pick(area.places);
    const landmark = pick(LANDMARKS);

    // spread over ~180 days
    const days = Math.pow(Math.random(), 1.6) * 180;
    const createdAt = daysAgo(Math.round(days));

    // Status distribution:
    // PENDING_APPROVAL: 12%
    // REJECTED: 8%
    // OPEN: 20%
    // ASSIGNED: 20%
    // IN_PROGRESS: 20%
    // RESOLVED: 20%
    const roll = Math.random();
    let status = "OPEN";
    if (roll < 0.12) {
      status = "PENDING_APPROVAL";
    } else if (roll < 0.20) {
      status = "REJECTED";
    } else if (roll < 0.40) {
      status = "OPEN";
    } else if (roll < 0.60) {
      status = "ASSIGNED";
    } else if (roll < 0.80) {
      status = "IN_PROGRESS";
    } else {
      status = "RESOLVED";
    }

    // Engineer assignment for ASSIGNED, IN_PROGRESS, RESOLVED
    // Prefer engineer matching the ward, or pick any engineer
    const wardEngineers = users.ENGINEER.filter((e) => e.ward === area.ward);
    const assignedEngineer =
      status === "ASSIGNED" || status === "IN_PROGRESS" || status === "RESOLVED"
        ? (wardEngineers.length ? pick(wardEngineers) : pick(users.ENGINEER))
        : null;

    const resolvedDaysAgo = status === "RESOLVED" ? Math.max(0, Math.round(days * 0.3)) : null;
    const startedDaysAgo = status === "IN_PROGRESS" || status === "RESOLVED" ? Math.max(1, Math.round(days * 0.6)) : null;
    const assignedDaysAgo = assignedEngineer ? Math.max(1, Math.round(days * 0.8)) : null;
    const approvedDaysAgo = status !== "PENDING_APPROVAL" && status !== "REJECTED" ? Math.max(1, Math.round(days * 0.9)) : null;

    const upvotes = rnd(35);
    const ai = classifyIssue(title, description, { upvotes, daysOpen: Math.round(days) });
    const reporter = pick(users.USER);

    // jitter coordinates slightly around the area centre (+- 0.015 deg ~ 1.5 km max)
    // ensure no identical duplicates by incorporating index
    const latOffset = (Math.random() - 0.5) * 0.028 + (i % 7) * 0.0005;
    const lngOffset = (Math.random() - 0.5) * 0.028 + (i % 5) * 0.0005;
    const latitude = +(area.lat + latOffset).toFixed(6);
    const longitude = +(area.lng + lngOffset).toFixed(6);

    const resolutionNotes = [
      "Repair completed by the ward maintenance team. Road surface leveled and cleared.",
      "Work completed and inspected by ward engineer. Functionality restored.",
      "Drainage cleared and silt removed; water flow restored normally.",
      "Transformer fuse replaced and street light cables secured safely.",
      "Garbage cleared completely and spot sanitised with disinfectant powder.",
    ];

    const issue = await prisma.issue.create({
      data: {
        title: `${title} — ${place}`,
        description,
        category,
        location: `${place}, ${landmark}`,
        ward: area.ward,
        landmark,
        latitude,
        longitude,
        status,
        priority: ai.priority,
        upvotes,
        aiCategory: ai.category,
        aiPriority: ai.priority,
        aiDepartment: ai.department,
        approvedById: status !== "PENDING_APPROVAL" && status !== "REJECTED" ? adminUser.id : null,
        approvedAt: approvedDaysAgo != null ? daysAgo(approvedDaysAgo) : null,
        rejectionReason:
          status === "REJECTED"
            ? pick([
                "Insufficient evidence provided or unable to locate the mentioned site.",
                "Out of municipal jurisdiction (private layout / property).",
                "Duplicate of existing reported issue in this area.",
              ])
            : null,
        assignedToId: assignedEngineer ? assignedEngineer.id : null,
        assignedAt: assignedDaysAgo != null ? daysAgo(assignedDaysAgo) : null,
        startedAt: startedDaysAgo != null ? daysAgo(startedDaysAgo) : null,
        resolvedAt: resolvedDaysAgo != null ? daysAgo(resolvedDaysAgo) : null,
        resolutionNote: status === "RESOLVED" ? pick(resolutionNotes) : null,
        createdAt,
        updatedAt: resolvedDaysAgo != null ? daysAgo(resolvedDaysAgo) : (startedDaysAgo != null ? daysAgo(startedDaysAgo) : createdAt),
        userId: reporter.id,
      },
    });

    // 1. Creation history row
    await prisma.issueStatusHistory.create({
      data: {
        issueId: issue.id,
        fromStatus: null,
        toStatus: "PENDING_APPROVAL",
        changedById: reporter.id,
        note: "Issue submitted by citizen",
        createdAt,
      },
    });

    // 2. Rejection history row
    if (status === "REJECTED") {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "PENDING_APPROVAL",
          toStatus: "REJECTED",
          changedById: adminUser.id,
          note: issue.rejectionReason,
          createdAt: daysAgo(Math.max(0, Math.round(days * 0.9))),
        },
      });
    }

    // 3. Approval history row
    if (status !== "PENDING_APPROVAL" && status !== "REJECTED") {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "PENDING_APPROVAL",
          toStatus: "OPEN",
          changedById: adminUser.id,
          note: "Issue verified and approved by municipal admin",
          createdAt: daysAgo(approvedDaysAgo),
        },
      });
    }

    // 4. Assignment history row
    if (assignedEngineer) {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "OPEN",
          toStatus: "ASSIGNED",
          changedById: adminUser.id,
          note: `Assigned to ${assignedEngineer.name} (${assignedEngineer.department || "Ward Engineer"})`,
          createdAt: daysAgo(assignedDaysAgo),
        },
      });
    }

    // 5. In Progress history row
    if (status === "IN_PROGRESS" || status === "RESOLVED") {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "ASSIGNED",
          toStatus: "IN_PROGRESS",
          changedById: assignedEngineer ? assignedEngineer.id : adminUser.id,
          note: "Engineer started work on site",
          createdAt: daysAgo(startedDaysAgo),
        },
      });
    }

    // 6. Resolved history row
    if (status === "RESOLVED") {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "IN_PROGRESS",
          toStatus: "RESOLVED",
          changedById: assignedEngineer ? assignedEngineer.id : adminUser.id,
          note: issue.resolutionNote,
          createdAt: daysAgo(resolvedDaysAgo),
        },
      });
    }

    // Upvotes
    if (upvotes > 0) {
      const voters = [];
      const voterCount = Math.min(upvotes, users.USER.length);
      for (let v = 0; v < voterCount; v++) {
        voters.push({
          userId: users.USER[(v + i) % users.USER.length].id,
          issueId: issue.id,
        });
      }
      await prisma.vote.createMany({ data: voters });
    }

    // Comments
    if (Math.random() > 0.4) {
      const commentsData = [
        {
          body: "Flagging this on behalf of local residents. Hope it gets addressed soon.",
          userId: reporter.id,
          isOfficial: false,
          createdAt: daysAgo(Math.max(0, Math.round(days * 0.95))),
        },
      ];
      if (status !== "PENDING_APPROVAL" && status !== "REJECTED") {
        commentsData.push({
          body: `Complaint noted and routed to the ${category.toLowerCase().replace("_", " ")} ward team.`,
          userId: adminUser.id,
          isOfficial: true,
          createdAt: daysAgo(Math.max(0, Math.round(days * 0.85))),
        });
      }
      if (assignedEngineer && (status === "IN_PROGRESS" || status === "RESOLVED")) {
        commentsData.push({
          body: `Site inspection completed. Crew dispatched with necessary equipment.`,
          userId: assignedEngineer.id,
          isOfficial: true,
          createdAt: daysAgo(Math.max(0, Math.round(days * 0.5))),
        });
      }
      if (status === "RESOLVED" && assignedEngineer) {
        commentsData.push({
          body: `Work has been successfully finished and verified on site. Issue closed. ✅`,
          userId: assignedEngineer.id,
          isOfficial: true,
          createdAt: daysAgo(resolvedDaysAgo || 0),
        });
      }
      await prisma.comment.createMany({
        data: commentsData.map((c) => ({ ...c, issueId: issue.id })),
      });
    }
  }

  /* ---------- Realistic Authentication Event Logs (14-day history) ---------- */
  console.log("🔐 Seeding realistic authentication event logs...");
  const authLogData = [];
  const sampleIps = ["106.51.24.112", "49.207.210.45", "157.48.19.82", "182.73.240.10", "122.172.85.34", "14.139.155.66"];
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.0.0 Mobile/15E148 Safari/604.1",
  ];

  for (let d = 13; d >= 0; d--) {
    const dayDate = daysAgo(d);
    // 5-12 successful logins per day
    const successCount = 6 + rnd(7);
    for (let s = 0; s < successCount; s++) {
      const u = s % 2 === 0 ? pick(users.USER) : (s % 3 === 0 ? pick(users.ENGINEER) : users.ADMIN[0]);
      const logTime = new Date(dayDate.getTime() + (s * 3600000 + rnd(1800000)));
      authLogData.push({
        eventType: "LOGIN_SUCCESS",
        email: u.email,
        role: u.role,
        failureReason: null,
        ipAddress: pick(sampleIps),
        userAgent: pick(userAgents),
        createdAt: logTime,
      });
      // occasional logout
      if (Math.random() > 0.4) {
        authLogData.push({
          eventType: "LOGOUT",
          email: u.email,
          role: u.role,
          failureReason: null,
          ipAddress: pick(sampleIps),
          userAgent: pick(userAgents),
          createdAt: new Date(logTime.getTime() + 1800000 + rnd(3600000)),
        });
      }
    }

    // 1-4 failed logins per day (bad password, invalid email, role mismatch)
    const failCount = 1 + rnd(4);
    for (let f = 0; f < failCount; f++) {
      const r = Math.random();
      let email = "unknown.citizen@gmail.com";
      let failureReason = "INVALID_EMAIL";
      let role = null;

      if (r < 0.5) {
        failureReason = "INCORRECT_PASSWORD";
        const targetUser = pick(users.USER);
        email = targetUser.email;
        role = targetUser.role;
      } else if (r < 0.75) {
        failureReason = "ROLE_MISMATCH";
        const targetUser = pick(users.ENGINEER);
        email = targetUser.email;
        role = targetUser.role;
      }

      authLogData.push({
        eventType: "LOGIN_FAILED",
        email,
        role,
        failureReason,
        ipAddress: pick(sampleIps),
        userAgent: pick(userAgents),
        createdAt: new Date(dayDate.getTime() + (f * 4200000 + rnd(2000000))),
      });
    }

    // 0-2 unauthorized access / expired sessions
    if (Math.random() > 0.5) {
      authLogData.push({
        eventType: "UNAUTHORIZED_ACCESS",
        email: pick(users.USER).email,
        role: "USER",
        failureReason: "ROLE_FORBIDDEN",
        ipAddress: pick(sampleIps),
        userAgent: pick(userAgents),
        createdAt: new Date(dayDate.getTime() + rnd(86400000)),
      });
    }
    if (Math.random() > 0.6) {
      authLogData.push({
        eventType: "SESSION_EXPIRED",
        email: pick(users.USER).email,
        role: "USER",
        failureReason: "TOKEN_EXPIRED",
        ipAddress: pick(sampleIps),
        userAgent: pick(userAgents),
        createdAt: new Date(dayDate.getTime() + rnd(86400000)),
      });
    }
  }

  await prisma.authLog.createMany({ data: authLogData });
  console.log(`✅ Seeded ${authLogData.length} authentication audit logs.`);

  const total = await prisma.issue.count();
  const pinned = await prisma.issue.count({ where: { latitude: { not: null } } });
  const pending = await prisma.issue.count({ where: { status: "PENDING_APPROVAL" } });
  const open = await prisma.issue.count({ where: { status: "OPEN" } });
  const assigned = await prisma.issue.count({ where: { status: "ASSIGNED" } });
  const inProgress = await prisma.issue.count({ where: { status: "IN_PROGRESS" } });
  const resolved = await prisma.issue.count({ where: { status: "RESOLVED" } });
  const rejected = await prisma.issue.count({ where: { status: "REJECTED" } });

  console.log(`✅ Seeded ${await prisma.user.count()} users, ${total} issues (${pinned} with GPS pins).`);
  console.log(`   Status breakdown: ${pending} pending, ${open} open, ${assigned} assigned, ${inProgress} in progress, ${resolved} resolved, ${rejected} rejected.`);
  console.log("Demo logins:");
  console.log("  • User:     user@civicfix.in / user123");
  console.log("  • Admin:    admin@civicfix.in / admin123");
  console.log("  • Engineer: engineer@civicfix.in / engineer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
