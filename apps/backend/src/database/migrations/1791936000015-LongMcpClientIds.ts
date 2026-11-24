import { MigrationInterface, QueryRunner } from "typeorm";

/** Some MCP servers (Netlify) issue client ids far longer than 255 characters. */
export class LongMcpClientIds1791936000015 implements MigrationInterface {
  name = "LongMcpClientIds1791936000015";
  async up(q: QueryRunner) {
    await q.query(
      "ALTER TABLE integration_clients MODIFY clientId varchar(2048) NOT NULL",
    );
  }
  async down(q: QueryRunner) {
    await q.query(
      "ALTER TABLE integration_clients MODIFY clientId varchar(255) NOT NULL",
    );
  }
}
