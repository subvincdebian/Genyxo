import { MigrationInterface, QueryRunner } from "typeorm";
export class DeviceIdentity1791936000011 implements MigrationInterface {
  async up(q: QueryRunner) {
    if (!(await q.hasColumn("auth_sessions", "deviceId")))
      await q.query("ALTER TABLE auth_sessions ADD deviceId varchar(64) NULL");
    const table = await q.getTable("auth_sessions");
    if (!table?.indices.some((index) => index.name === "IDX_auth_device"))
      await q.query(
        "CREATE INDEX IDX_auth_device ON auth_sessions (userId, deviceId)",
      );
    if (!table?.indices.some((index) => index.name === "IDX_auth_history"))
      await q.query(
        "CREATE INDEX IDX_auth_history ON auth_sessions (userId, createdAt, id)",
      );
    await q.query(
      "CREATE TABLE IF NOT EXISTS user_interaction_settings (userId int NOT NULL PRIMARY KEY, settings json NOT NULL, CONSTRAINT FK_interaction_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB",
    );
  }
  async down(q: QueryRunner) {
    await q.query("DROP TABLE user_interaction_settings");
    await q.query(
      "ALTER TABLE auth_sessions DROP INDEX IDX_auth_history, DROP INDEX IDX_auth_device, DROP COLUMN deviceId",
    );
  }
}
