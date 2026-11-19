import "dotenv/config";
import prisma from "./src/config/prisma.js";

const WARD_AREAS = [
  { ward: "Ward 42 – Majestic", lat: 12.9762, lng: 77.5746, spots: ["City Railway Station Road", "Tank Bund Road", "K.G. Road", "Chickpet Cross"] },
  { ward: "Ward 84 – Koramangala", lat: 12.9352, lng: 77.6245, spots: ["80 Feet Road 4th Block", "Sony World Signal", "1st Block Near Wipro Park", "Koramangala Club Road"] },
  { ward: "Ward 76 – Indiranagar", lat: 12.9719, lng: 77.6412, spots: ["100 Feet Road Junction", "12th Main Road", "HAL 2nd Stage", "Double Road Near ESI"] },
  { ward: "Ward 150 – Whitefield", lat: 12.9698, lng: 77.7500, spots: ["ECC Road", "Channasandra Main Road", "ITPL Tech Park Gate 3", "Hope Farm Junction"] },
  { ward: "Ward 163 – Jayanagar", lat: 12.9250, lng: 77.5938, spots: ["3rd Block East", "9th Block Main Market", "Cool Joint Circle", "Pattabhirama Nagar"] },
  { ward: "Ward 4 – Yelahanka", lat: 13.1005, lng: 77.5963, spots: ["Major Sandeep Unnikrishnan Road", "Yelahanka Old Town Market", "Kogilu Cross", "Attur Layout"] },
  { ward: "Ward 27 – Hebbal", lat: 13.0358, lng: 77.5970, spots: ["Outer Ring Road Flyover", "Kempapura Main Road", "Bhadrappa Layout", "Ganganagar 1st Main"] },
  { ward: "Ward 178 – Banashankari", lat: 12.9250, lng: 77.5460, spots: ["Kathriguppe Main Road", "BSK 3rd Stage 100ft Road", "Chennammanakere Achukattu", "Girinagar Circle"] },
  { ward: "Ward 66 – Rajajinagar", lat: 12.9910, lng: 77.5500, spots: ["1st Block Ramamurthy Road", "ESI Hospital Cross", "Navrang Theatre Road", "Rajajinagar Metro Station"] },
  { ward: "Ward 152 – Marathahalli", lat: 12.9591, lng: 77.6974, spots: ["Multiplex Service Road", "Munnekolala Lake Road", "Ashwath Nagar Main Road", "Spice Garden Layout"] },
  { ward: "Ward 38 – Malleshwaram", lat: 13.0050, lng: 77.5690, spots: ["Margosa Road 15th Cross", "Sampige Road 8th Cross", "Malleswaram Circle", "Vyalikaval Main Road"] },
  { ward: "Ward 180 – Electronic City", lat: 12.8452, lng: 77.6602, spots: ["Neeladri Nagar 2nd Cross", "Electronic City Phase 1 Main Gate", "Velankani Drive", "Wipro Gate 5"] },
];

const CATEGORY_DATA = {
  ROAD: {
    titles: [
      "Severe asphalt crater causing vehicle tyre burst",
      "Manhole cover collapsed into deep trench",
      "Pavement pavers broken and dislodged",
      "Speed breaker without reflective paint causing night crashes",
      "Unfinished road widening with loose gravel heaps",
      "Sunken road section after heavy downpour",
    ],
    photo: "/img/pothole.jpg",
    department: "Roads & Infrastructure",
  },
  STREET_LIGHT: {
    titles: [
      "Series of 5 street light poles flickering and shorting",
      "Dark stretch of 400m near metro station",
      "Exposed electrical wiring at base of street light pole",
      "LED light fixture hanging precariously by cable",
      "Street light timer failure: lights stay off throughout the night",
      "Broken light bracket following vehicle collision",
    ],
    photo: "/img/streetlight.jpg",
    department: "Electrical & Lighting",
  },
  WATER: {
    titles: [
      "Main water pipeline burst flooding residential lane",
      "Sewage backflow contaminating drinking water line",
      "Open stormwater drain clogged with plastic debris",
      "Drinking water pipeline leaking thousands of litres daily",
      "Underground drainage chamber overflowing onto main street",
      "Low water pressure reported across 3 blocks for 5 days",
    ],
    photo: "/img/water.jpg",
    department: "Water Supply & Drainage",
  },
  SANITATION: {
    titles: [
      "Illegal garbage dumping hotspot blocking footpath",
      "Overflowing municipal bin attracting stray cattle",
      "Dead animal carcass unattended on roadside",
      "Construction debris dumped in vacant corner plot",
      "Commercial market waste piled up without daily clearance",
      "Garbage truck missing scheduled morning collection for 4 days",
    ],
    photo: "/img/garbage.jpg",
    department: "Sanitation & Waste Management",
  },
  ELECTRICITY: {
    titles: [
      "Transformer sparking vigorously during evening peak load",
      "Low hanging high-tension wire touching tree canopy",
      "Damaged feeder pillar box with broken door",
      "Frequent phase drops and power fluctuations causing appliance damage",
      "Electric supply cable severed during optical fiber excavation",
    ],
    photo: "/img/electricity.jpg",
    department: "Electrical & Lighting",
  },
  PARK: {
    titles: [
      "Fallen tree limb blocking walking trail in public park",
      "Broken children playground swing with sharp rusted edges",
      "Park perimeter fence vandalised allowing stray dogs entry",
      "Broken solar lights and open irrigation pit in neighbourhood park",
    ],
    photo: "/img/park.jpg",
    department: "Horticulture & Parks",
  },
  GAS: {
    titles: [
      "Piped natural gas odour reported near apartment entrance",
      "Gas pipeline valve box damaged during road trenching",
      "Hissing noise from PNG distribution meter manifold",
    ],
    photo: "/img/gas.jpg",
    department: "City Gas Utility",
  },
  OTHER: {
    titles: [
      "Broken civic notice board at junction",
      "Public drinking water fountain vandalised",
      "Street name directional board dislodged",
    ],
    photo: "/img/community.jpg",
    department: "Municipal Administration",
  },
};

const RESOLUTION_TEMPLATES = {
  ROAD: "Asphalt cold-mix patched and hot-rolled with vibratory compactor. Surface leveled and open to traffic.",
  STREET_LIGHT: "Defective 90W LED luminaire replaced and terminal block re-wired. Illumination verified active.",
  WATER: "Underground 150mm cast iron pipe clamp installed and pressure tested. Stormwater drain de-silted.",
  SANITATION: "Entire garbage heap cleared using municipal tipper truck. Area sprayed with disinfectant lime powder.",
  ELECTRICITY: "Transformer bushing insulators serviced and high-tension jumper re-crimped. Supply restored stable.",
  PARK: "Fallen tree branches sawn and hauled away. Playground equipment welded and primed with safety coating.",
  GAS: "Gas pipe isolation valve serviced and soap-solution bubble tested for zero leakage. Flow verified.",
  OTHER: "Site inspected and necessary civic repair works completed. Public safety verified.",
};

async function main() {
  console.log("🚀 Starting supplementary dummy data generator...");

  const users = await prisma.user.findMany();
  const citizenUser = users.find((u) => u.email === "user@civicfix.in");
  const engineerSuresh = users.find((u) => u.email === "engineer@civicfix.in");
  const adminOfficer = users.find((u) => u.email === "admin@civicfix.in");
  const otherEngineers = users.filter((u) => u.role === "ENGINEER" && u.id !== engineerSuresh?.id);
  const otherCitizens = users.filter((u) => u.role === "USER" && u.id !== citizenUser?.id);

  if (!citizenUser || !engineerSuresh || !adminOfficer) {
    console.error("Required demo users not found!");
    process.exit(1);
  }

  const now = new Date(); // ~Nov 3, 2026
  let addedCount = 0;

  // Plan dummy issues
  // 1. Citizen demo user issues (15 issues across all 7 statuses)
  const citizenIssuesPlan = [
    // PENDING_APPROVAL (2)
    {
      cat: "ROAD",
      status: "PENDING_APPROVAL",
      priority: "HIGH",
      daysAgo: 0.2, // Today
      title: "Deep pothole outside Koramangala BDA complex",
      desc: "Large crater formed right outside the BDA complex gate. Water collects inside making depth invisible to two-wheelers.",
      wardIdx: 1,
    },
    {
      cat: "SANITATION",
      status: "PENDING_APPROVAL",
      priority: "MEDIUM",
      daysAgo: 0.5, // Today
      title: "Commercial food waste dumped beside bus stop",
      desc: "Local eateries are dumping black plastic garbage bags on the sidewalk every night. Foul smell and stray dogs.",
      wardIdx: 2,
    },
    // OPEN (2)
    {
      cat: "WATER",
      status: "OPEN",
      priority: "CRITICAL",
      daysAgo: 1.5,
      title: "Continuous drinking water leakage on 12th Main Road",
      desc: "Treated Cauvery water gushing out of broken connection valve onto the road. Wasting thousands of litres daily.",
      wardIdx: 2,
    },
    {
      cat: "STREET_LIGHT",
      status: "OPEN",
      priority: "HIGH",
      daysAgo: 2,
      title: "Three consecutive streetlights dark near park entrance",
      desc: "Complete dark zone for senior citizens doing morning and evening walks. Very unsafe after 7 PM.",
      wardIdx: 4,
    },
    // ASSIGNED (2) - assigned to Suresh
    {
      cat: "ROAD",
      status: "ASSIGNED",
      priority: "CRITICAL",
      daysAgo: 3,
      title: "Broken pavement slabs tripping pedestrians on 100ft road",
      desc: "Several concrete footpath slabs broken in half. Multiple pedestrians have tripped and injured themselves.",
      wardIdx: 2,
      assignedEng: engineerSuresh,
    },
    {
      cat: "ELECTRICITY",
      status: "ASSIGNED",
      priority: "HIGH",
      daysAgo: 4,
      title: "Junction box exposed at children play park corner",
      desc: "Metal door of electrical junction box has rusted and fallen off. Live wires within reach of children.",
      wardIdx: 1,
      assignedEng: engineerSuresh,
    },
    // IN_PROGRESS (2) - assigned to Suresh
    {
      cat: "ROAD",
      status: "IN_PROGRESS",
      priority: "CRITICAL",
      daysAgo: 5,
      title: "Sunken manhole frame causing heavy vehicle jams",
      desc: "Manhole collar has sunken 4 inches below bitumen grade. Causes severe shock to passing vehicles.",
      wardIdx: 1,
      assignedEng: engineerSuresh,
    },
    {
      cat: "SANITATION",
      status: "IN_PROGRESS",
      priority: "HIGH",
      daysAgo: 4,
      title: "Overflowing dumper bin near Indiranagar metro station",
      desc: "Massive pile of mixed household waste spilling over 20 meters of road space.",
      wardIdx: 2,
      assignedEng: engineerSuresh,
    },
    // RESOLVED (3) - Ready for Citizen Verification!
    {
      cat: "ROAD",
      status: "RESOLVED",
      priority: "HIGH",
      daysAgo: 6,
      title: "Cracked speed breaker repaired with cold asphalt",
      desc: "Dangerous speed breaker with exposed reinforcement iron rods on 5th Block Road.",
      wardIdx: 1,
      assignedEng: engineerSuresh,
      resNote: "Repairs completed: Road surface patched with bituminous mix, compacted and painted with white reflective hazard strips.",
    },
    {
      cat: "STREET_LIGHT",
      status: "RESOLVED",
      priority: "MEDIUM",
      daysAgo: 7,
      title: "Streetlight fixture replacement near Sony World junction",
      desc: "Sodium vapour lamp bulb was dead for over 10 days.",
      wardIdx: 1,
      assignedEng: engineerSuresh,
      resNote: "Fixture replaced with new energy-efficient 90W LED luminaire. Tested fully operational at 230V.",
    },
    {
      cat: "WATER",
      status: "RESOLVED",
      priority: "CRITICAL",
      daysAgo: 8,
      title: "Blocked stormwater drain chamber cleared",
      desc: "Drainage chamber clogged with construction silt causing water stagnation.",
      wardIdx: 2,
      assignedEng: engineerSuresh,
      resNote: "Drainage blockage cleared using vacuum suction unit; water flow verified and chamber slab resealed.",
    },
    // CLOSED (Verified by Citizen) (3)
    {
      cat: "SANITATION",
      status: "CLOSED",
      priority: "HIGH",
      daysAgo: 12,
      title: "Illegal roadside garbage cleared and sanitized",
      desc: "Litter and rotting waste accumulation on 80ft road corner.",
      wardIdx: 1,
      assignedEng: engineerSuresh,
      resNote: "Area thoroughly cleared by sanitation team and disinfected with bleaching agent.",
    },
    {
      cat: "PARK",
      status: "CLOSED",
      priority: "MEDIUM",
      daysAgo: 15,
      title: "Broken park swing fixed and welded",
      desc: "Children swing broken at junction joint.",
      wardIdx: 4,
      assignedEng: engineerSuresh,
      resNote: "Welding executed, reinforced with steel gusset and painted.",
    },
    {
      cat: "ROAD",
      status: "CLOSED",
      priority: "HIGH",
      daysAgo: 20,
      title: "Pothole filled near Jyoti Nivas College",
      desc: "Deep trench crossing entire road width.",
      wardIdx: 1,
      assignedEng: engineerSuresh,
      resNote: "Trench backfilled with wet mix macadam and topped with asphalt overlay.",
    },
    // REJECTED (1)
    {
      cat: "OTHER",
      status: "REJECTED",
      priority: "LOW",
      daysAgo: 10,
      title: "Private residential compound wall repair",
      desc: "Requesting municipal corporation to paint private boundary wall.",
      wardIdx: 2,
      rejectionReason: "Private residential property issue. Municipal services only cover public roads, infrastructure and municipal properties.",
    },
  ];

  for (const item of citizenIssuesPlan) {
    const area = WARD_AREAS[item.wardIdx];
    const catMeta = CATEGORY_DATA[item.cat];
    const createdDate = new Date(now.getTime() - item.daysAgo * 86400000);
    const approvedDate = item.status !== "PENDING_APPROVAL" ? new Date(createdDate.getTime() + 3600000 * 2) : null;
    const assignedDate = item.assignedEng ? new Date(createdDate.getTime() + 3600000 * 5) : null;
    const startedDate = ["IN_PROGRESS", "RESOLVED", "CLOSED"].includes(item.status) ? new Date(createdDate.getTime() + 3600000 * 12) : null;
    const resolvedDate = ["RESOLVED", "CLOSED"].includes(item.status) ? new Date(createdDate.getTime() + 3600000 * 36) : null;

    const issue = await prisma.issue.create({
      data: {
        title: item.title,
        description: item.desc,
        category: item.cat,
        location: `${area.spots[Math.floor(Math.random() * area.spots.length)]}, ${area.ward}`,
        ward: area.ward,
        landmark: area.spots[0],
        latitude: area.lat + (Math.random() - 0.5) * 0.008,
        longitude: area.lng + (Math.random() - 0.5) * 0.008,
        status: item.status,
        priority: item.priority,
        upvotes: Math.floor(Math.random() * 15) + 3,
        aiCategory: item.cat,
        aiPriority: item.priority,
        aiDepartment: catMeta.department,
        userId: citizenUser.id,
        createdAt: createdDate,
        updatedAt: resolvedDate || startedDate || approvedDate || createdDate,
        approvedById: approvedDate ? adminOfficer.id : null,
        approvedAt: approvedDate,
        assignedToId: item.assignedEng ? item.assignedEng.id : null,
        assignedAt: assignedDate,
        startedAt: startedDate,
        resolvedAt: resolvedDate,
        resolutionNote: item.resNote || null,
        rejectionReason: item.rejectionReason || null,
      },
    });

    // Add before photo
    await prisma.issueImage.create({
      data: {
        issueId: issue.id,
        url: catMeta.photo,
        createdAt: createdDate,
      },
    });

    // Add after photo if resolved/closed
    if (["RESOLVED", "CLOSED"].includes(item.status)) {
      await prisma.issueImage.create({
        data: {
          issueId: issue.id,
          url: "/img/resolved.jpg",
          createdAt: resolvedDate || now,
        },
      });
    }

    // Add Status History entries
    await prisma.issueStatusHistory.create({
      data: {
        issueId: issue.id,
        fromStatus: null,
        toStatus: "PENDING_APPROVAL",
        changedById: citizenUser.id,
        note: "Issue report submitted by citizen with photographic evidence.",
        createdAt: createdDate,
      },
    });

    if (approvedDate) {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "PENDING_APPROVAL",
          toStatus: "OPEN",
          changedById: adminOfficer.id,
          note: "Reviewed and verified by City Administrator. Priority confirmed.",
          createdAt: approvedDate,
        },
      });
    }

    if (assignedDate && item.assignedEng) {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "OPEN",
          toStatus: "ASSIGNED",
          changedById: adminOfficer.id,
          note: `Work order dispatched to ${item.assignedEng.name} (${catMeta.department}).`,
          createdAt: assignedDate,
        },
      });
    }

    if (startedDate) {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "ASSIGNED",
          toStatus: "IN_PROGRESS",
          changedById: item.assignedEng?.id || engineerSuresh.id,
          note: "Field crew and materials deployed on site. Physical repair commenced.",
          createdAt: startedDate,
        },
      });
    }

    if (resolvedDate) {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "IN_PROGRESS",
          toStatus: "RESOLVED",
          changedById: item.assignedEng?.id || engineerSuresh.id,
          note: item.resNote || "Work completed and verified on site.",
          createdAt: resolvedDate,
        },
      });
    }

    if (item.status === "CLOSED") {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "RESOLVED",
          toStatus: "CLOSED",
          changedById: citizenUser.id,
          note: "Citizen verified satisfactory completion of repairs. Issue closed.",
          createdAt: new Date(resolvedDate.getTime() + 86400000),
        },
      });
    }

    // Add comments
    if (["IN_PROGRESS", "RESOLVED", "CLOSED"].includes(item.status)) {
      await prisma.comment.create({
        data: {
          issueId: issue.id,
          userId: citizenUser.id,
          body: "Any update on when the work will finish? Traffic gets heavy in the evenings.",
          isOfficial: false,
          createdAt: new Date(createdDate.getTime() + 86400000),
        },
      });
      await prisma.comment.create({
        data: {
          issueId: issue.id,
          userId: engineerSuresh.id,
          body: "Field team is on site right now. Expected to complete before 5 PM today.",
          isOfficial: true,
          createdAt: new Date(createdDate.getTime() + 86400000 * 1.5),
        },
      });
    }

    addedCount++;
  }

  // 2. City-Wide Issues for High-Density Analytics & Maps (40 additional issues across all 12 wards and recent 14 days)
  const categoriesList = ["ROAD", "STREET_LIGHT", "WATER", "SANITATION", "ELECTRICITY", "PARK", "GAS"];
  const statusesList = [
    "PENDING_APPROVAL",
    "OPEN",
    "OPEN",
    "ASSIGNED",
    "ASSIGNED",
    "IN_PROGRESS",
    "IN_PROGRESS",
    "RESOLVED",
    "RESOLVED",
    "CLOSED",
  ];
  const prioritiesList = ["CRITICAL", "HIGH", "HIGH", "MEDIUM", "MEDIUM", "LOW"];

  for (let i = 0; i < 45; i++) {
    const cat = categoriesList[i % categoriesList.length];
    const catMeta = CATEGORY_DATA[cat];
    const area = WARD_AREAS[i % WARD_AREAS.length];
    const status = statusesList[i % statusesList.length];
    const priority = prioritiesList[i % prioritiesList.length];
    const citizen = otherCitizens[i % otherCitizens.length] || citizenUser;
    const eng = [engineerSuresh, ...otherEngineers][i % (otherEngineers.length + 1)];

    // Spread across last 14 days (Nov 1 - Nov 3 heavily, plus late October)
    const daysAgo = (i % 14) * 0.9 + (Math.random() * 0.5);
    const createdDate = new Date(now.getTime() - daysAgo * 86400000);
    const approvedDate = status !== "PENDING_APPROVAL" ? new Date(createdDate.getTime() + 3600000 * 2) : null;
    const assignedDate = ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(status) ? new Date(createdDate.getTime() + 3600000 * 6) : null;
    const startedDate = ["IN_PROGRESS", "RESOLVED", "CLOSED"].includes(status) ? new Date(createdDate.getTime() + 3600000 * 14) : null;
    const resolvedDate = ["RESOLVED", "CLOSED"].includes(status) ? new Date(createdDate.getTime() + 3600000 * 30) : null;

    const titleTemplate = catMeta.titles[i % catMeta.titles.length];
    const spot = area.spots[i % area.spots.length];

    const issue = await prisma.issue.create({
      data: {
        title: `${titleTemplate} — ${spot}`,
        description: `Field inspection confirmed ${titleTemplate.toLowerCase()} near ${spot}. Poses public inconvenience and hazard. Immediate municipal intervention requested.`,
        category: cat,
        location: `${spot}, ${area.ward}`,
        ward: area.ward,
        landmark: `Near ${spot}`,
        latitude: area.lat + (Math.random() - 0.5) * 0.012,
        longitude: area.lng + (Math.random() - 0.5) * 0.012,
        status: status,
        priority: priority,
        upvotes: Math.floor(Math.random() * 25) + 1,
        aiCategory: cat,
        aiPriority: priority,
        aiDepartment: catMeta.department,
        userId: citizen.id,
        createdAt: createdDate,
        updatedAt: resolvedDate || startedDate || approvedDate || createdDate,
        approvedById: approvedDate ? adminOfficer.id : null,
        approvedAt: approvedDate,
        assignedToId: assignedDate ? eng.id : null,
        assignedAt: assignedDate,
        startedAt: startedDate,
        resolvedAt: resolvedDate,
        resolutionNote: resolvedDate ? RESOLUTION_TEMPLATES[cat] : null,
      },
    });

    // Image
    await prisma.issueImage.create({
      data: {
        issueId: issue.id,
        url: catMeta.photo,
        createdAt: createdDate,
      },
    });

    if (resolvedDate) {
      await prisma.issueImage.create({
        data: {
          issueId: issue.id,
          url: "/img/resolved.jpg",
          createdAt: resolvedDate,
        },
      });
    }

    // Status History
    await prisma.issueStatusHistory.create({
      data: {
        issueId: issue.id,
        fromStatus: null,
        toStatus: "PENDING_APPROVAL",
        changedById: citizen.id,
        note: "Citizen grievance filed.",
        createdAt: createdDate,
      },
    });

    if (approvedDate) {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "PENDING_APPROVAL",
          toStatus: "OPEN",
          changedById: adminOfficer.id,
          note: "Approved by Admin Officer.",
          createdAt: approvedDate,
        },
      });
    }

    if (assignedDate) {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "OPEN",
          toStatus: "ASSIGNED",
          changedById: adminOfficer.id,
          note: `Assigned to ${eng.name}.`,
          createdAt: assignedDate,
        },
      });
    }

    if (startedDate) {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "ASSIGNED",
          toStatus: "IN_PROGRESS",
          changedById: eng.id,
          note: "Repair work underway.",
          createdAt: startedDate,
        },
      });
    }

    if (resolvedDate) {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "IN_PROGRESS",
          toStatus: "RESOLVED",
          changedById: eng.id,
          note: RESOLUTION_TEMPLATES[cat],
          createdAt: resolvedDate,
        },
      });
    }

    if (status === "CLOSED") {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: "RESOLVED",
          toStatus: "CLOSED",
          changedById: citizen.id,
          note: "Citizen verified work resolution.",
          createdAt: new Date(resolvedDate.getTime() + 43200000),
        },
      });
    }

    addedCount++;
  }

  // 3. Add 6 Overdue Issues from 8-14 days ago in Critical/High priority that are ASSIGNED/IN_PROGRESS
  const overdueConfigs = [
    { cat: "WATER", title: "Overdue: Major drainage breach near Sony World junction", wardIdx: 1, daysAgo: 10, prio: "CRITICAL" },
    { cat: "ROAD", title: "Overdue: Deep trench across 100ft Road intersection", wardIdx: 2, daysAgo: 12, prio: "CRITICAL" },
    { cat: "STREET_LIGHT", title: "Overdue: High-voltage pole spark near ITPL gate", wardIdx: 3, daysAgo: 9, prio: "HIGH" },
    { cat: "SANITATION", title: "Overdue: Massive municipal waste blockade near market", wardIdx: 0, daysAgo: 8, prio: "HIGH" },
    { cat: "ELECTRICITY", title: "Overdue: Substation feeder cable insulation exposed", wardIdx: 11, daysAgo: 11, prio: "CRITICAL" },
    { cat: "ROAD", title: "Overdue: Collapsed culvert slab on airport road", wardIdx: 5, daysAgo: 14, prio: "CRITICAL" },
  ];

  for (const od of overdueConfigs) {
    const area = WARD_AREAS[od.wardIdx];
    const catMeta = CATEGORY_DATA[od.cat];
    const createdDate = new Date(now.getTime() - od.daysAgo * 86400000);

    const issue = await prisma.issue.create({
      data: {
        title: od.title,
        description: `URGENT SLA BREACH: This ticket was raised ${od.daysAgo} days ago and has exceeded the mandatory service level turnaround. Immediate escalation required.`,
        category: od.cat,
        location: `${area.spots[0]}, ${area.ward}`,
        ward: area.ward,
        landmark: area.spots[0],
        latitude: area.lat + 0.002,
        longitude: area.lng - 0.002,
        status: "IN_PROGRESS",
        priority: od.prio,
        upvotes: 32,
        aiCategory: od.cat,
        aiPriority: od.prio,
        aiDepartment: catMeta.department,
        userId: citizenUser.id,
        createdAt: createdDate,
        updatedAt: new Date(createdDate.getTime() + 86400000 * 2),
        approvedById: adminOfficer.id,
        approvedAt: new Date(createdDate.getTime() + 3600000 * 4),
        assignedToId: engineerSuresh.id,
        assignedAt: new Date(createdDate.getTime() + 3600000 * 6),
        startedAt: new Date(createdDate.getTime() + 3600000 * 18),
      },
    });

    await prisma.issueImage.create({
      data: {
        issueId: issue.id,
        url: catMeta.photo,
        createdAt: createdDate,
      },
    });

    await prisma.issueStatusHistory.create({
      data: {
        issueId: issue.id,
        fromStatus: null,
        toStatus: "PENDING_APPROVAL",
        changedById: citizenUser.id,
        note: "Urgent citizen issue report.",
        createdAt: createdDate,
      },
    });

    await prisma.issueStatusHistory.create({
      data: {
        issueId: issue.id,
        fromStatus: "PENDING_APPROVAL",
        toStatus: "OPEN",
        changedById: adminOfficer.id,
        note: "Approved by Admin.",
        createdAt: new Date(createdDate.getTime() + 3600000 * 4),
      },
    });

    await prisma.issueStatusHistory.create({
      data: {
        issueId: issue.id,
        fromStatus: "OPEN",
        toStatus: "ASSIGNED",
        changedById: adminOfficer.id,
        note: `Dispatched to ${engineerSuresh.name}.`,
        createdAt: new Date(createdDate.getTime() + 3600000 * 6),
      },
    });

    await prisma.issueStatusHistory.create({
      data: {
        issueId: issue.id,
        fromStatus: "ASSIGNED",
        toStatus: "IN_PROGRESS",
        changedById: engineerSuresh.id,
        note: "Work started on site but delayed due to equipment constraints. SLA escalated.",
        createdAt: new Date(createdDate.getTime() + 3600000 * 18),
      },
    });

    addedCount++;
  }

  const finalCount = await prisma.issue.count();
  const byStatus = await prisma.issue.groupBy({ by: ["status"], _count: { id: true } });

  console.log(`✅ Successfully added ${addedCount} rich dummy issues!`);
  console.log(`📊 New Total Database Issues: ${finalCount}`);
  console.log("Status Breakdown:", byStatus);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error adding dummy data:", err);
  process.exit(1);
});
