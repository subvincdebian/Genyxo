import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class GeneratedMedia1791936000005 implements MigrationInterface {
  name = "GeneratedMedia1791936000005";
  async up(runner: QueryRunner): Promise<void> {
    await runner.createTable(
      new Table({
        name: "generated_media",
        columns: [
          { name: "id", type: "varchar", length: "36", isPrimary: true },
          { name: "userId", type: "int" },
          { name: "conversationId", type: "int", isNullable: true },
          { name: "kind", type: "varchar", length: "12" },
          {
            name: "status",
            type: "varchar",
            length: "12",
            default: "'pending'",
          },
          { name: "mimeType", type: "varchar", length: "80", isNullable: true },
          { name: "prompt", type: "text" },
          { name: "provider", type: "varchar", length: "80" },
          { name: "jobId", type: "varchar", length: "120", isNullable: true },
          { name: "data", type: "longblob", isNullable: true },
          { name: "cost", type: "int", default: 0 },
          { name: "error", type: "varchar", length: "300", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          {
            name: "updatedAt",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
        indices: [
          {
            name: "IDX_generated_media_owner",
            columnNames: ["userId", "createdAt"],
          },
        ],
      }),
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.dropTable("generated_media");
  }
}
