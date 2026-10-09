import dataSource from "./data-source";

const LOCK_NAME = "genyxo_db_migration_lock";
const LOCK_TIMEOUT_SECONDS = 60;

export async function runMigrationsWithLock() {
  console.log("[Migration Runner] Initializing database connection...");
  await dataSource.initialize();

  let hasLock = false;
  try {
    console.log(
      `[Migration Runner] Acquiring advisory lock "${LOCK_NAME}" (timeout: ${LOCK_TIMEOUT_SECONDS}s)...`,
    );

    const lockResult: any = await dataSource.query(
      `SELECT GET_LOCK('${LOCK_NAME}', ${LOCK_TIMEOUT_SECONDS}) AS locked;`,
    );

    const isLocked =
      Number(lockResult?.[0]?.locked) === 1 ||
      lockResult?.[0]?.locked === "1" ||
      lockResult?.[0]?.locked === 1;

    if (!isLocked) {
      console.error(
        `[Migration Runner] Timed out after ${LOCK_TIMEOUT_SECONDS}s waiting for migration lock. Another process is running migrations.`,
      );
      process.exit(1);
    }

    hasLock = true;
    console.log(
      "[Migration Runner] Lock acquired. Executing pending migrations...",
    );

    const executed = await dataSource.runMigrations();
    if (executed && executed.length > 0) {
      console.log(
        `[Migration Runner] Successfully executed ${executed.length} migration(s):`,
      );
      for (const m of executed) {
        console.log(`  ✔ ${m.name}`);
      }
    } else {
      console.log(
        "[Migration Runner] No pending migrations. Schema is up to date.",
      );
    }
  } catch (err: any) {
    console.error(
      `[Migration Runner] Fatal error during migration: ${err.message}`,
      err.stack,
    );
    process.exit(1);
  } finally {
    if (hasLock) {
      try {
        await dataSource.query(`SELECT RELEASE_LOCK('${LOCK_NAME}');`);
        console.log("[Migration Runner] Advisory lock released successfully.");
      } catch (releaseErr: any) {
        console.warn(
          `[Migration Runner] Warning: failed to release lock: ${releaseErr.message}`,
        );
      }
    }

    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  void runMigrationsWithLock();
}
