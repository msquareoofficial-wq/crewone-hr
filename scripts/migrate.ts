// Powered By Vistech Force
import { readFileSync } from "fs";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  for (const f of ["schema.sql", "schema_chat2.sql", "schema_projects.sql", "schema_projects2.sql", "schema_projects3.sql", "schema_live.sql", "schema_perms.sql", "schema_desig.sql", "schema_proj_bg.sql", "schema_boards.sql", "schema_social.sql", "schema_activity.sql", "schema_v3.sql", "schema_push.sql", "schema_hybrid.sql", "schema_break_cat.sql", "schema_missed_out.sql", "schema_finance.sql", "schema_finance2.sql", "schema_punches.sql"]) await pool.query(readFileSync(f, "utf8").replace(/^﻿/, ""));
  console.log("Schema ready");
  await pool.end();
}
main().catch((e) => {
  if (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ENOENT"].includes(e.code) || String(e).includes("password authentication")) {
    console.warn("DB unreachable during build, skipping migration:", e.message);
    process.exit(0);
  }
  console.error(e); process.exit(1);
});
