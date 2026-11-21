import { MigrationInterface, QueryRunner, Table } from "typeorm";

const timestamps = [
  { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
  {
    name: "updatedAt",
    type: "datetime",
    default: "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  },
];

export class Integrations1791936000004 implements MigrationInterface {
  name = "Integrations1791936000004";
  async up(runner: QueryRunner): Promise<void> {
    await runner.createTable(
      new Table({
        name: "integration_connections",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "userId", type: "int" },
          { name: "pluginId", type: "varchar", length: "40" },
          {
            name: "accountLabel",
            type: "varchar",
            length: "200",
            isNullable: true,
          },
          { name: "scopes", type: "json", isNullable: true },
          { name: "encryptedAccessToken", type: "text" },
          { name: "encryptedRefreshToken", type: "text", isNullable: true },
          { name: "expiresAt", type: "datetime", isNullable: true },
          { name: "metadata", type: "json", isNullable: true },
          {
            name: "status",
            type: "varchar",
            length: "16",
            default: "'connected'",
          },
          ...timestamps,
        ],
        indices: [
          {
            name: "UQ_integration_owner_plugin",
            columnNames: ["userId", "pluginId"],
            isUnique: true,
          },
        ],
      }),
    );
    await runner.createTable(
      new Table({
        name: "integration_actions",
        columns: [
          { name: "id", type: "varchar", length: "36", isPrimary: true },
          { name: "userId", type: "int" },
          { name: "conversationId", type: "int", isNullable: true },
          { name: "messageId", type: "int", isNullable: true },
          { name: "pluginId", type: "varchar", length: "40" },
          { name: "tool", type: "varchar", length: "64" },
          { name: "args", type: "json" },
          { name: "preview", type: "json" },
          {
            name: "status",
            type: "varchar",
            length: "16",
            default: "'pending'",
          },
          { name: "result", type: "json", isNullable: true },
          { name: "expiresAt", type: "datetime" },
          ...timestamps,
        ],
        indices: [
          {
            name: "IDX_integration_action_owner",
            columnNames: ["userId", "createdAt"],
          },
        ],
      }),
    );
    await runner.createTable(
      new Table({
        name: "integration_clients",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "issuer", type: "varchar", length: "255" },
          { name: "redirectUri", type: "varchar", length: "255" },
          { name: "clientId", type: "varchar", length: "255" },
          { name: "encryptedClientSecret", type: "text", isNullable: true },
          {
            name: "authMethod",
            type: "varchar",
            length: "40",
            default: "'none'",
          },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
        ],
        indices: [
          {
            name: "UQ_integration_client",
            columnNames: ["issuer", "redirectUri"],
            isUnique: true,
          },
        ],
      }),
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.dropTable("integration_clients");
    await runner.dropTable("integration_actions");
    await runner.dropTable("integration_connections");
  }
}
