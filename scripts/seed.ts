// Powered By Vistech Force
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Creates the first admin once. If an admin already exists (or the env vars are missing) it does nothing,
// so redeploying never resets a password the admin has changed.
async function main() {
  const reset = process.env.RESET_ADMIN_PASSWORD;
  if (reset && reset.length >= 8) {
    const pool0 = new Pool({ connectionString: process.env.DATABASE_URL });
    const r = await pool0.query("UPDATE users SET password_hash=$1, active=TRUE WHERE role='admin'", [await bcrypt.hash(reset, 10)]);
    console.log("Admin password reset for", r.rowCount, "admin account(s). Remove RESET_ADMIN_PASSWORD now.");
    await pool0.end();
  }
  const email = process.env.ADMIN_EMAIL, pw = process.env.ADMIN_PASSWORD;
  if (!email || !pw) { console.log("ADMIN_EMAIL/ADMIN_PASSWORD not set, skipping seed"); return; }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const exists = await pool.query("SELECT 1 FROM users WHERE role='admin' LIMIT 1");
  if (exists.rowCount) { console.log("Admin already exists, skipping seed"); await pool.end(); return; }
  await pool.query(
    "INSERT INTO users (emp_id, role, name, email, password_hash) VALUES ('ADMIN','admin','Admin',$1,$2) ON CONFLICT DO NOTHING",
    [email, await bcrypt.hash(pw, 10)]
  );
  console.log("Admin created:", email);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
