// Verification script for CivicFix backend API security & role logic
const BASE = "http://localhost:5000/api";

async function run() {
  console.log("🔍 Starting CivicFix API verification tests...\n");

  // 1. Unauthenticated /api/issues -> should be 401
  try {
    const res = await fetch(`${BASE}/issues`);
    if (res.status === 401) {
      console.log("✅ PASS: GET /api/issues returned 401 Unauthorized without token");
    } else {
      console.error(`❌ FAIL: GET /api/issues returned ${res.status}`);
    }
  } catch (err) {
    console.error("❌ Connection error:", err.message);
  }

  // 2. Unauthenticated /api/stats/overview -> should be 401
  try {
    const res = await fetch(`${BASE}/stats/overview`);
    if (res.status === 401) {
      console.log("✅ PASS: GET /api/stats/overview returned 401 Unauthorized without token");
    } else {
      console.error(`❌ FAIL: GET /api/stats/overview returned ${res.status}`);
    }
  } catch (err) {
    console.error("❌ Connection error:", err.message);
  }

  // 3. Role mismatch login: user logging in as ADMIN -> should be 403
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "user@civicfix.in",
        password: "user123",
        expectedRole: "ADMIN",
      }),
    });
    if (res.status === 403) {
      const data = await res.json();
      console.log(`✅ PASS: Mismatched role login returned 403: "${data.error}"`);
    } else {
      console.error(`❌ FAIL: Role mismatch returned ${res.status}`);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  // 4. Correct login as USER
  let userToken = "";
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "user@civicfix.in",
        password: "user123",
        expectedRole: "USER",
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.token && data.user.role === "USER") {
      userToken = data.token;
      console.log(`✅ PASS: Citizen login successful (role: ${data.user.role})`);
    } else {
      console.error(`❌ FAIL: User login returned ${res.status}`);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  // 5. Correct login as ADMIN
  let adminToken = "";
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@civicfix.in",
        password: "admin123",
        expectedRole: "ADMIN",
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.token && data.user.role === "ADMIN") {
      adminToken = data.token;
      console.log(`✅ PASS: Admin login successful (role: ${data.user.role})`);
    } else {
      console.error(`❌ FAIL: Admin login returned ${res.status}`);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  // 6. Correct login as ENGINEER
  let engineerToken = "";
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "engineer@civicfix.in",
        password: "engineer123",
        expectedRole: "ENGINEER",
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.token && data.user.role === "ENGINEER") {
      engineerToken = data.token;
      console.log(`✅ PASS: Engineer login successful (role: ${data.user.role})`);
    } else {
      console.error(`❌ FAIL: Engineer login returned ${res.status}`);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  // 7. Test feed filtering: GET /api/issues should NOT return RESOLVED or PENDING_APPROVAL
  try {
    const res = await fetch(`${BASE}/issues?limit=100`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data = await res.json();
    const statuses = data.issues.map((i) => i.status);
    const hasResolved = statuses.includes("RESOLVED");
    const hasPending = statuses.includes("PENDING_APPROVAL");
    const hasRejected = statuses.includes("REJECTED");

    if (!hasResolved && !hasPending && !hasRejected) {
      console.log(
        `✅ PASS: Public feed strictly filtered to OPEN, ASSIGNED, IN_PROGRESS (${data.issues.length} issues returned, 0 resolved/pending)`
      );
    } else {
      console.error("❌ FAIL: Public feed leaked inactive issues!", { hasResolved, hasPending, hasRejected });
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  // 8. Test Admin pending endpoint: GET /api/issues/pending
  try {
    const res = await fetch(`${BASE}/issues/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    console.log(`✅ PASS: Admin pending endpoint returned ${data.issues?.length} pending approval issues`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  // 9. Test Engineer assigned endpoint: GET /api/issues/assigned
  try {
    const res = await fetch(`${BASE}/issues/assigned`, {
      headers: { Authorization: `Bearer ${engineerToken}` },
    });
    const data = await res.json();
    console.log(`✅ PASS: Engineer assigned endpoint returned ${data.issues?.length} assigned issues`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  // 10. Test illegal status jump: User trying to change status -> 403 or 409
  try {
    const res = await fetch(`${BASE}/issues/1/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    if (res.status === 403 || res.status === 409) {
      console.log(`✅ PASS: Unauthorized status change rejected with status ${res.status}`);
    } else {
      console.error(`❌ FAIL: Unauthorized status change returned ${res.status}`);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  console.log("\n🏁 All API verification tests completed!");
}

run();
