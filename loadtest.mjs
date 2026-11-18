// Load test for CrewOne. Needs Node 18+ only. No install.
// Usage:
//   node loadtest.mjs https://techminds-hr.vercel.app LOADTEST_ID LOADTEST_PASSWORD
// Use a dummy employee user, NOT a real one. Every login adds an activity log row.
const [base, id, pw] = process.argv.slice(2);
if (!base || !id || !pw) { console.log("Usage: node loadtest.mjs <baseUrl> <id> <password>"); process.exit(1); }

const STEPS = [10, 25, 50, 100, 150];   // concurrent virtual users
const HOLD_SECS = 20;                   // how long each step runs
const pct = (a, p) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;

async function login() {
  const r = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: id, password: pw }) });
  const c = (r.headers.getSetCookie?.() || []).map((x) => x.split(";")[0]).join("; ");
  return r.ok && c ? c : null;
}

async function user(stop, stats) {
  const t0 = performance.now();
  const cookie = await login().catch(() => null);
  stats.login.push(performance.now() - t0);
  if (!cookie) { stats.loginFail++; return; }
  // Mimic a user with dashboard + chat open: poll like the real client does.
  const paths = ["/api/live", "/api/chat/rooms", "/api/chat/unread", "/api/me"];
  let i = 0;
  while (performance.now() < stop) {
    const p = paths[i++ % paths.length];
    const s = performance.now();
    try {
      const r = await fetch(base + p, { headers: { cookie } });
      stats.req.push(performance.now() - s);
      if (!r.ok) stats.bad++;
    } catch { stats.bad++; }
    await new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));
  }
}

for (const n of STEPS) {
  const stats = { login: [], req: [], loginFail: 0, bad: 0 };
  const stop = performance.now() + HOLD_SECS * 1000;
  await Promise.all(Array.from({ length: n }, () => user(stop, stats)));
  console.log(`${String(n).padStart(4)} users | login p50 ${Math.round(pct(stats.login, .5))}ms p95 ${Math.round(pct(stats.login, .95))}ms | req p50 ${Math.round(pct(stats.req, .5))}ms p95 ${Math.round(pct(stats.req, .95))}ms | login fails ${stats.loginFail} | bad responses ${stats.bad}/${stats.req.length}`);
  if (stats.loginFail > n * 0.1 || stats.bad > stats.req.length * 0.05) { console.log("Errors crossed 5-10%, stopping here. This is your limit."); break; }
  await new Promise((r) => setTimeout(r, 5000));
}
