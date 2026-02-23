/**
 * Data migration: ErrorItem schema change
 *
 * Old fields: processStep, fixCost, fixTimeHours
 * New fields: employee, hourlyRate, timeHours, timeUnit, calendarDays, extraCost
 *
 * Mapping:
 *   fixCost       -> extraCost
 *   fixTimeHours  -> timeHours
 *   fixTimeHours  -> calendarDays (= max(1, fixTimeHours / 8) when > 0)
 *   processStep   -> prepended to name (so context is not lost)
 *   employee      = "" (hourlyRate will be filled by user)
 *
 * The script is idempotent:
 *   - Checks PRAGMA table_info to detect which columns exist
 *   - Only runs ALTER TABLE if old columns still exist
 *   - Safe to run multiple times
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

type ColumnInfo = { name: string };

async function getColumns(table: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<ColumnInfo[]>(
    `PRAGMA table_info("${table}")`
  );
  return new Set(rows.map((r) => r.name));
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const cols = await getColumns(table);
  return cols.has(column);
}

async function migrate() {
  console.log("ErrorItem migration: checking current schema...");

  const cols = await getColumns("ErrorItem");
  const hasOldSchema = cols.has("fixCost") || cols.has("fixTimeHours") || cols.has("processStep");
  const hasNewSchema = cols.has("extraCost") && cols.has("timeHours") && cols.has("employee");

  if (!hasOldSchema) {
    console.log("Old columns not found — migration not needed or already applied.");
    return;
  }

  console.log("Old columns detected. Running migration...");

  // Step 1: Add new columns if they don't exist yet
  const newColumns: Array<{ name: string; ddl: string }> = [
    { name: "employee",     ddl: `ALTER TABLE "ErrorItem" ADD COLUMN "employee" TEXT NOT NULL DEFAULT ''` },
    { name: "hourlyRate",   ddl: `ALTER TABLE "ErrorItem" ADD COLUMN "hourlyRate" REAL NOT NULL DEFAULT 0` },
    { name: "timeHours",    ddl: `ALTER TABLE "ErrorItem" ADD COLUMN "timeHours" REAL NOT NULL DEFAULT 0` },
    { name: "timeUnit",     ddl: `ALTER TABLE "ErrorItem" ADD COLUMN "timeUnit" TEXT NOT NULL DEFAULT 'hours'` },
    { name: "calendarDays", ddl: `ALTER TABLE "ErrorItem" ADD COLUMN "calendarDays" REAL NOT NULL DEFAULT 0` },
    { name: "extraCost",    ddl: `ALTER TABLE "ErrorItem" ADD COLUMN "extraCost" REAL NOT NULL DEFAULT 0` },
  ];

  for (const col of newColumns) {
    if (!cols.has(col.name)) {
      console.log(`  Adding column: ${col.name}`);
      await prisma.$executeRawUnsafe(col.ddl);
    } else {
      console.log(`  Column already exists: ${col.name}`);
    }
  }

  // Step 2: Copy data from old columns into new ones
  // Only run if old columns still present (they will be dropped by prisma db push after this script)
  if (cols.has("fixCost") || cols.has("fixTimeHours")) {
    console.log("  Copying fixCost -> extraCost, fixTimeHours -> timeHours + calendarDays...");
    await prisma.$executeRawUnsafe(`
      UPDATE "ErrorItem" SET
        "extraCost" = COALESCE("fixCost", 0),
        "timeHours" = COALESCE("fixTimeHours", 0),
        "calendarDays" = CASE
          WHEN COALESCE("fixTimeHours", 0) > 0
          THEN MAX(1.0, CAST("fixTimeHours" AS REAL) / 8.0)
          ELSE 0
        END
    `);
  }

  if (cols.has("processStep")) {
    console.log("  Prepending processStep to name...");
    await prisma.$executeRawUnsafe(`
      UPDATE "ErrorItem" SET
        "name" = CASE
          WHEN "processStep" IS NOT NULL AND TRIM("processStep") != ''
          THEN TRIM("processStep") || ' — ' || "name"
          ELSE "name"
        END
      WHERE "processStep" IS NOT NULL AND TRIM("processStep") != ''
    `);
  }

  console.log("Migration complete. Run 'npx prisma db push' to drop old columns.");
}

migrate()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
