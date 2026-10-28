import { MigrationInterface, QueryRunner } from "typeorm";
export class ActiveSessions1791936000010 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(
      `CREATE TABLE IF NOT EXISTS auth_sessions (id varchar(64) NOT NULL PRIMARY KEY, userId int NOT NULL, sessionVersion int NOT NULL DEFAULT 0, userAgent varchar(512) NOT NULL DEFAULT '', ip varchar(64) NOT NULL DEFAULT '', createdAt datetime NOT NULL, lastUsedAt datetime NOT NULL, expiresAt datetime NOT NULL, revokedAt datetime NULL, INDEX IDX_auth_sessions_user_expiry (userId, expiresAt), CONSTRAINT FK_auth_sessions_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
    );
  }
  async down(q: QueryRunner) {
    await q.dropTable("auth_sessions", true);
  }
}
