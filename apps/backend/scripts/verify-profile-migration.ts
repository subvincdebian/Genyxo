import { DataSource } from "typeorm";
import source from "../src/database/data-source";
import { AccountSessions1791936000009 } from "../src/database/migrations/1791936000009-AccountSessions";
import { ActiveSessions1791936000010 } from "../src/database/migrations/1791936000010-ActiveSessions";
import { strict as assert } from "node:assert";

async function main() {
  const options = source.options;
  if (
    options.type !== "mysql" ||
    options.replication ||
    !["mysql", "localhost", "127.0.0.1"].includes(options.host || "")
  )
    throw new Error("This check runs only against a local MySQL instance.");
  const database = `genyxo_profile_qa_${Date.now()}`;
  await source.initialize();
  let isolated: DataSource | undefined;
  try {
    await source.query(`CREATE DATABASE \`${database}\``);
    isolated = new DataSource({
      ...options,
      database,
      entities: [],
      migrations: [],
    });
    await isolated.initialize();
    await isolated.query("CREATE TABLE users (id INT PRIMARY KEY)");
    await isolated.query(
      "CREATE TABLE transactions (id INT PRIMARY KEY, creditsAmount INT NOT NULL)",
    );
    await isolated.query(
      "INSERT INTO transactions VALUES (1, 500), (2, -17), (3, 0)",
    );
    const runner = isolated.createQueryRunner();
    try {
      const migration = new AccountSessions1791936000009();
      await migration.up(runner);
      const preserved = await runner.query(
        "SELECT creditsAmount FROM transactions ORDER BY id",
      );
      assert.deepEqual(
        preserved.map((row: { creditsAmount: string }) =>
          Number(row.creditsAmount),
        ),
        [500, -17, 0],
      );
      await runner.query("INSERT INTO transactions VALUES (4, -0.25)");
      const fractional = await runner.query(
        "SELECT creditsAmount FROM transactions WHERE id = 4",
      );
      assert.equal(Number(fractional[0].creditsAmount), -0.25);
      await assert.rejects(() => migration.down(runner), /fractional entries/);
      await runner.query("DELETE FROM transactions WHERE id = 4");
      await migration.down(runner);
      const sessions = new ActiveSessions1791936000010();
      await sessions.up(runner);
      await runner.query("INSERT INTO users (id) VALUES (1)");
      await runner.query(
        "INSERT INTO auth_sessions (id,userId,createdAt,lastUsedAt,expiresAt) VALUES (?,1,UTC_TIMESTAMP(),UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY))",
        ["a".repeat(64)],
      );
      await runner.query(
        "UPDATE auth_sessions SET revokedAt=UTC_TIMESTAMP() WHERE userId=1",
      );
      assert.equal(
        Number(
          (
            await runner.query(
              "SELECT COUNT(*) n FROM auth_sessions WHERE revokedAt IS NULL",
            )
          )[0].n,
        ),
        0,
      );
      await runner.query("DELETE FROM users WHERE id=1");
      assert.equal(
        Number(
          (await runner.query("SELECT COUNT(*) n FROM auth_sessions"))[0].n,
        ),
        0,
      );
      await sessions.down(runner);
      console.log(
        "Profile migration: existing values preserved, fractional credits stored, lossy rollback blocked, integer rollback passed; session revocation and cascade passed.",
      );
    } finally {
      await runner.release();
    }
  } finally {
    if (isolated?.isInitialized) await isolated.destroy();
    await source.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await source.destroy();
  }
}
void main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
