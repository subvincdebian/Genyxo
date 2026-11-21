import { randomUUID } from "crypto";
import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from "typeorm";

/**
 * Chats get an unguessable key for their URL (/c/<uuid>) instead of the
 * sequential id. Existing rows are backfilled with random v4 UUIDs from
 * Node, not MySQL's UUID(), whose v1 values are time-based and predictable.
 */
export class ConversationPublicId1791936000007 implements MigrationInterface {
  name = "ConversationPublicId1791936000007";
  async up(runner: QueryRunner): Promise<void> {
    if (!(await runner.hasColumn("conversation", "publicId")))
      await runner.addColumn(
        "conversation",
        new TableColumn({
          name: "publicId",
          type: "char",
          length: "36",
          isNullable: true,
        }),
      );
    const rows: { id: number }[] = await runner.query(
      "SELECT id FROM conversation WHERE publicId IS NULL",
    );
    for (const row of rows)
      await runner.query(
        "UPDATE conversation SET publicId = ?, updatedAt = updatedAt WHERE id = ?",
        [randomUUID(), row.id],
      );
    const table = await runner.getTable("conversation");
    if (
      !table?.indices.some(
        (index) => index.name === "IDX_conversation_public_id",
      )
    )
      await runner.createIndex(
        "conversation",
        new TableIndex({
          name: "IDX_conversation_public_id",
          columnNames: ["publicId"],
          isUnique: true,
        }),
      );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.dropIndex("conversation", "IDX_conversation_public_id");
    await runner.dropColumn("conversation", "publicId");
  }
}
