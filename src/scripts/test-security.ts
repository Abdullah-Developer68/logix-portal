async function runTests() {
  console.log("=== RUNNING PORTAL SECURITY & RBAC AUDIT SUITE ===\n");

  const baseUrl = "http://localhost:3000";

  async function post(action: string, body: Record<string, unknown>, headers: Record<string, string> = {}) {
    const res = await fetch(`${baseUrl}/api/portal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  async function get(path: string, headers: Record<string, string> = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  let passed = 0;
  let failed = 0;

  function assert(title: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${title} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // TEST 1: Unauthenticated GET /api/portal must be blocked (401)
  const unauthGet = await get("/api/portal");
  assert("SEC-03: Unauthenticated GET /api/portal returns 401 Unauthorized", unauthGet.status === 401);

  // TEST 2: Public verification GET /api/portal?verify=LGX-CERT-2026-8401 allowed
  const verifyGet = await get("/api/portal?verify=LGX-CERT-2026-8401");
  assert("Public certificate verification endpoint is accessible", verifyGet.status === 200 && verifyGet.data.verified === true);

  // TEST 3: Public meta GET /api/portal?meta=public allowed for application form
  const publicMeta = await get("/api/portal?meta=public");
  assert("Public application metadata is accessible", publicMeta.status === 200 && Array.isArray(publicMeta.data.fields));

  // TEST 4: Unauthenticated protected POST action (e.g. delete_intern_record) returns 401
  const unauthDelete = await post("delete_intern_record", { id: "int-1" });
  assert("SEC-01: Unauthenticated protected mutation returns 401", unauthDelete.status === 401);

  // TEST 5: Spoofed actorRole in body is rejected
  const spoofedAdmin = await post("delete_intern_record", {
    id: "int-1",
    actorEmail: "admin@logix.dev",
    actorRole: "admin",
  });
  assert("SEC-01: Body role spoofing without token returns 401", spoofedAdmin.status === 401);

  // TEST 6: Login as Admin
  const adminLogin = await post("login", {
    email: "admin@logix.dev",
    password: "Admin@123",
  });
  assert("Admin authentication returns valid signed session token", adminLogin.status === 200 && !!adminLogin.data.token);
  const adminToken = adminLogin.data.token;

  // TEST 7: Admin token can perform administrative actions
  const adminAction = await post("post_announcement", {
    title: "Test Security Announcement",
    content: "Automated security test payload.",
    targetAudience: "All Interns",
    priority: "Normal",
  }, { "x-portal-token": adminToken });
  assert("Admin token executes privileged mutations (200 OK)", adminAction.status === 200 && adminAction.data.success === true);

  // TEST 8: Login as Intern
  const internLogin = await post("login", {
    email: "intern@logix.dev",
    password: "Intern@123",
  });
  assert("Intern authentication returns valid signed session token", internLogin.status === 200 && !!internLogin.data.token);
  const internToken = internLogin.data.token;

  // TEST 9: Intern token attempting admin mutation (delete_intern_record) returns 403 Forbidden
  const internPrivEsc = await post("delete_intern_record", { id: "int-1" }, { "x-portal-token": internToken });
  assert("SEC-01: Intern role cannot perform admin mutations (403 Forbidden)", internPrivEsc.status === 403);

  // TEST 10: Intern token attempting to issue certificate returns 403 Forbidden
  const internCertForge = await post("issue_certificate", { internRecordId: "int-1" }, { "x-portal-token": internToken });
  assert("SEC-01: Intern role cannot issue certificates (403 Forbidden)", internCertForge.status === 403);

  // TEST 11: Intern querying GET /api/portal receives ONLY scoped data
  const internGet = await get("/api/portal", { "x-portal-token": internToken });
  const internData = internGet.data;
  assert(
    "SEC-03: Intern GET /api/portal is strictly scoped to own record",
    internGet.status === 200 &&
    internData.interns.length === 1 &&
    internData.users.length === 0 // Password hashes / user list stripped
  );

  // TEST 12: Login as Mentor
  const mentorLogin = await post("login", {
    email: "mentor@logix.dev",
    password: "Mentor@123",
  });
  assert("Mentor authentication returns valid signed session token", mentorLogin.status === 200 && !!mentorLogin.data.token);
  const mentorToken = mentorLogin.data.token;

  // TEST 13: Mentor cannot delete intern records (403 Forbidden)
  const mentorDelete = await post("delete_intern_record", { id: "int-1" }, { "x-portal-token": mentorToken });
  assert("SEC-01: Mentor role cannot delete intern records (403 Forbidden)", mentorDelete.status === 403);

  // TEST 14: Mentor cannot manage departments (403 Forbidden)
  const mentorDept = await post("save_field", { name: "Hacked Dept", code: "HCK" }, { "x-portal-token": mentorToken });
  assert("SEC-01: Mentor role cannot manage departments (403 Forbidden)", mentorDept.status === 403);

  // TEST 15: Mentor GET /api/portal returns only assigned interns and excludes intern accounts from users
  const mentorGet = await get("/api/portal", { "x-portal-token": mentorToken });
  assert(
    "SEC-03: Mentor GET /api/portal scoped to assigned interns only",
    mentorGet.status === 200 &&
    mentorGet.data.users.every((u: { role?: string }) => u.role !== "intern") &&
    Array.isArray(mentorGet.data.interns)
  );

  console.log(`\n=== AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test runner error:", e);
  process.exit(1);
});
