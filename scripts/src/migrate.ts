/**
 * migrate.ts — apply any un-run SQL migrations to the Supabase database.
 *
 * Usage:  pnpm --filter @workspace/scripts run migrate
 *
 * Requires the DATABASE_URL Replit secret (session-mode pooler, port 5432).
 * Tracks applied migrations in a `_migrations` table it creates on first run.
 */

import { spawnSync } from "child_process";
import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "../../supabase/migrations");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set. Add it as a Replit secret.");
  process.exit(1);
}

// ── psql helpers ──────────────────────────────────────────────────────────────

/** Run a SQL string, return stdout. Throws on non-zero exit. */
function sql(query: string): string {
  const r = spawnSync(
    "psql",
    [DATABASE_URL as string, "--no-psqlrc", "-t", "-A", "-c", query],
    { encoding: "utf-8", timeout: 30_000 },
  );
  if (r.status !== 0) {
    const msg = (r.stderr ?? "").trim() || `exit code ${r.status ?? "?"}`;
    throw new Error(`psql error: ${msg}`);
  }
  return r.stdout ?? "";
}

/** Run a .sql file, streaming output to the terminal. Throws on non-zero exit. */
function sqlFile(filePath: string): void {
  const r = spawnSync(
    "psql",
    [DATABASE_URL as string, "--no-psqlrc", "-f", filePath],
    { encoding: "utf-8", timeout: 60_000 },
  );
  if ((r.stdout ?? "").trim()) process.stdout.write(r.stdout);
  if ((r.stderr ?? "").trim()) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    throw new Error(`psql exited with code ${r.status ?? "?"}`);
  }
}

// ── bootstrap tracking table ──────────────────────────────────────────────────

sql(`
  CREATE TABLE IF NOT EXISTS _migrations (
    filename   TEXT        PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);

// ── resolve pending files ─────────────────────────────────────────────────────

const appliedRaw = sql("SELECT filename FROM _migrations;").trim();
const applied = new Set(appliedRaw.split("\n").filter(Boolean));

const allFiles = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort(); // lexicographic sort keeps 001 < 002 < … order

const pending = allFiles.filter((f) => !applied.has(f));

if (pending.length === 0) {
  console.log("✓ Database is up to date — no pending migrations.");
  process.exit(0);
}

console.log(`${pending.length} pending migration(s):\n`);
pending.forEach((f) => console.log(`  • ${f}`));
console.log();

// ── apply each pending migration ──────────────────────────────────────────────

for (const file of pending) {
  process.stdout.write(`Applying ${file} … `);
  try {
    sqlFile(join(MIGRATIONS_DIR, file));
    // Escape single quotes in filename (filenames shouldn't have them, but be safe)
    const safe = file.replace(/'/g, "''");
    sql(`INSERT INTO _migrations (filename) VALUES ('${safe}');`);
    console.log("✓");
  } catch (err) {
    console.log("✗");
    console.error(`\n❌  Failed on ${file}:`);
    console.error(err instanceof Error ? err.message : String(err));
    console.error("\nMigration run stopped. Fix the error above and re-run.");
    process.exit(1);
  }
}

console.log("\n✓ All migrations applied.");
