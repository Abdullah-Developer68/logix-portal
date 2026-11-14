async function runTests() {
  console.log("=== RUNNING PORTAL SECURITY & RBAC AUDIT SUITE ===\n");

  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";

  async function post(
    action: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ) {
    const res = await fetch(`${baseUrl}/api/portal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
        ...headers,
      },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      status: res.status,
      data,
      cookie: res.headers.get("set-cookie")?.split(";")[0] || "",
    };
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
      console.log(`PASS: ${title}`);
      passed++;
    } else {
      console.error(`FAIL: ${title} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // TEST 1: Unauthenticated GET /api/portal must be blocked (401)
  const unauthGet = await get("/api/portal");
  assert(
    "SEC-03: Unauthenticated GET /api/portal returns 401 Unauthorized",
    unauthGet.status === 401,
    `status=${unauthGet.status}`,
  );

  // TEST 2: Public meta GET /api/portal?meta=public allowed for application form
  const publicMeta = await get("/api/portal?meta=public");
  assert(
    "Public application metadata is accessible",
    publicMeta.status === 200 && Array.isArray(publicMeta.data.fields),
    `status=${publicMeta.status}`,
  );

  // TEST 3: Unauthenticated protected POST action returns 401
  const unauthDelete = await post("delete_intern_record", { id: "int-1" });
  assert(
    "SEC-01: Unauthenticated protected mutation returns 401",
    unauthDelete.status === 401,
    `status=${unauthDelete.status}`,
  );

  // TEST 4: Cross-origin POST is rejected with 403
  const badOrigin = await post(
    "login",
    { email: "nobody@example.com", password: "wrongpassword" },
    { Origin: "https://evil.example.com" },
  );
  assert(
    "CSRF: Cross-origin POST returns 403 Forbidden",
    badOrigin.status === 403,
    `status=${badOrigin.status}`,
  );

  // TEST 5: Invalid login returns 401 without demoCode leakage
  const badLogin = await post("login", {
    email: "nonexistent@example.com",
    password: "notavalidpassword",
  });
  assert(
    "Auth: Unknown user login returns 401",
    badLogin.status === 401 && !("demoCode" in badLogin.data),
    `status=${badLogin.status}`,
  );

  // TEST 6: Cron endpoint rejects missing/wrong secret
  const badCron = await get("/api/cron/deadline-reminders", {
    Authorization: "Bearer wrong-secret",
  });
  assert(
    "Cron: Unauthenticated cron trigger returns 401",
    badCron.status === 401,
    `status=${badCron.status}`,
  );

  // Optional authenticated admin test if TEST_ADMIN_EMAIL & TEST_ADMIN_PASSWORD are provided
  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const adminLogin = await post("login", {
      email: adminEmail,
      password: adminPassword,
      expectedRole: "admin",
    });
    assert(
      "Admin login sets portal_session httpOnly cookie",
      adminLogin.status === 200 &&
        adminLogin.cookie.startsWith("portal_session="),
      `status=${adminLogin.status}`,
    );

    if (adminLogin.cookie) {
      const adminGet = await get("/api/portal", { Cookie: adminLogin.cookie });
      assert(
        "Admin GET /api/portal returns PortalState with no password hashes",
        adminGet.status === 200 &&
          adminGet.data.authenticated === true &&
          Array.isArray(adminGet.data.users) &&
          adminGet.data.users.every(
            (u: Record<string, unknown>) => !("passwordHash" in u),
          ),
        `status=${adminGet.status}`,
      );
    }
  } else {
    console.log(
      "INFO: Skipping authenticated admin checks (set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run them).",
    );
  }

  console.log(`\n=== AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test runner error:", e);
  process.exit(1);
});
