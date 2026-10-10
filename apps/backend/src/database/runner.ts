import type { QueryRunner } from "typeorm";
import dataSource from "./data-source";

const LOCK_NAME = "genyxo_db_migration_lock";
const LOCK_TIMEOUT_SECONDS = 60;

function hasMigrationLock(result: unknown): boolean {
  const row: unknown = Array.isArray(result) ? result[0] : undefined;
  return (
    typeof row === "object" &&
    row !== null &&
    "locked" in row &&
    (row.locked === 1 || row.locked === "1")
  );
}

export async function runMigrationsWithLock(): Promise<void> {
  let lockRunner: QueryRunner | undefined;
  let hasLock = false;
  try {
    console.log("[Migration Runner] Initializing database connection...");
    await dataSource.initialize();
    // MySQL advisory locks belong to a connection, not to the connection pool.
    lockRunner = dataSource.createQueryRunner("master");
    await lockRunner.connect();
    const result: unknown = await lockRunner.query(
      "SELECT GET_LOCK(?, ?) AS locked",
      [LOCK_NAME, LOCK_TIMEOUT_SECONDS],
    );
    if (!hasMigrationLock(result)) {
      throw new Error("Timed out waiting for the migration lock.");
    }
    hasLock = true;
    const executed = await dataSource.runMigrations();
    console.log(
      `[Migration Runner] Completed ${executed.length} migration(s).`,
    );
  } finally {
    // Always release the same connection, including failed migrations and timeouts.
    try {
      if (hasLock && lockRunner) {
        await lockRunner.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
      }
    } finally {
      try {
        await lockRunner?.release();
      } finally {
        if (dataSource.isInitialized) await dataSource.destroy();
      }
    }
  }
}

export async function runMigrationCli(): Promise<void> {
  try {
    await runMigrationsWithLock();
  } catch {
    // Database errors may contain SQL or credentials; keep deployment logs safe.
    console.error(
      "[Migration Runner] Migration failed. Check database access, lock contention and pending migrations.",
    );
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void runMigrationCli();
}
