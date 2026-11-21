import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from "typeorm";

export class WorkspaceResources1791936000003 implements MigrationInterface {
  name = "WorkspaceResources1791936000003";
  async up(runner: QueryRunner): Promise<void> {
    const columns: Record<string, any[]> = {
      conversation: [
        { name: "pinnedAt", type: "datetime", isNullable: true },
        { name: "archivedAt", type: "datetime", isNullable: true },
        {
          name: "lastActivityAt",
          type: "datetime",
          default: "CURRENT_TIMESTAMP",
        },
        {
          name: "titleSource",
          type: "varchar",
          length: "16",
          default: "'fallback'",
        },
        { name: "titleVersion", type: "int", default: 0 },
        {
          name: "titleStatus",
          type: "varchar",
          length: "16",
          default: "'idle'",
        },
        { name: "titleAttempts", type: "int", default: 0 },
        { name: "titleLeaseUntil", type: "datetime", isNullable: true },
        { name: "presetId", type: "int", isNullable: true },
      ],
      chat_projects: [
        { name: "pinnedAt", type: "datetime", isNullable: true },
        { name: "presetId", type: "int", isNullable: true },
      ],
      chat_library_items: [
        { name: "isFavorite", type: "tinyint", default: 0 },
        { name: "folderId", type: "int", isNullable: true },
      ],
    };
    for (const [table, list] of Object.entries(columns)) {
      for (const column of list)
        await runner.addColumn(table, new TableColumn(column));
    }
    // Retain existing ordering and protect historical names from automatic jobs.
    await runner.query(
      "UPDATE conversation SET lastActivityAt = updatedAt, titleSource = 'manual', titleStatus = 'complete', updatedAt = updatedAt",
    );
    await runner.createIndex(
      "conversation",
      new TableIndex({
        name: "IDX_workspace_activity",
        columnNames: ["userId", "lastActivityAt", "id"],
      }),
    );
    await runner.createTable(
      new Table({
        name: "chat_workspace_records",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "userId", type: "int" },
          { name: "kind", type: "varchar", length: "24" },
          { name: "recordKey", type: "varchar", length: "64" },
          { name: "data", type: "json" },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          {
            name: "updatedAt",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
        indices: [
          { name: "IDX_workspace_owner_kind", columnNames: ["userId", "kind"] },
          {
            name: "UQ_workspace_owner_key",
            columnNames: ["userId", "kind", "recordKey"],
            isUnique: true,
          },
        ],
      }),
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.dropTable("chat_workspace_records");
    await runner.dropIndex("conversation", "IDX_workspace_activity");
    for (const name of [
      "pinnedAt",
      "archivedAt",
      "lastActivityAt",
      "titleSource",
      "titleVersion",
      "titleStatus",
      "titleAttempts",
      "titleLeaseUntil",
      "presetId",
    ])
      await runner.dropColumn("conversation", name);
    for (const name of ["pinnedAt", "presetId"])
      await runner.dropColumn("chat_projects", name);
    for (const name of ["isFavorite", "folderId"])
      await runner.dropColumn("chat_library_items", name);
  }
}
