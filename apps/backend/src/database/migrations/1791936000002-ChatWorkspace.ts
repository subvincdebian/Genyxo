import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from "typeorm";

export class ChatWorkspace1791936000002 implements MigrationInterface {
  name = "ChatWorkspace1791936000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "chat_projects",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "userId", type: "int" },
          { name: "name", type: "varchar", length: "100" },
          { name: "instructions", type: "text", isNullable: true },
          { name: "files", type: "json", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          {
            name: "updatedAt",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      }),
    );
    await queryRunner.createTable(
      new Table({
        name: "chat_library_items",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "userId", type: "int" },
          { name: "name", type: "varchar", length: "255" },
          { name: "type", type: "varchar", length: "20" },
          { name: "url", type: "text", isNullable: true },
          { name: "content", type: "mediumtext", isNullable: true },
          { name: "sourceMessageId", type: "int", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
        ],
      }),
    );
    await queryRunner.addColumn(
      "conversation",
      new TableColumn({ name: "projectId", type: "int", isNullable: true }),
    );
    await queryRunner.addColumn(
      "messages",
      new TableColumn({
        name: "alternativeToMessageId",
        type: "int",
        isNullable: true,
      }),
    );
    await queryRunner.createIndex(
      "chat_projects",
      new TableIndex({
        name: "IDX_chat_projects_user_updated",
        columnNames: ["userId", "updatedAt"],
      }),
    );
    await queryRunner.createIndex(
      "chat_library_items",
      new TableIndex({
        name: "IDX_chat_library_user_created",
        columnNames: ["userId", "createdAt"],
      }),
    );
    await queryRunner.createIndex(
      "conversation",
      new TableIndex({
        name: "IDX_conversation_project_id",
        columnNames: ["projectId"],
      }),
    );
    await queryRunner.createIndex(
      "messages",
      new TableIndex({
        name: "IDX_messages_alternative_to",
        columnNames: ["alternativeToMessageId"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("messages", "IDX_messages_alternative_to");
    await queryRunner.dropIndex("conversation", "IDX_conversation_project_id");
    await queryRunner.dropColumn("messages", "alternativeToMessageId");
    await queryRunner.dropColumn("conversation", "projectId");
    await queryRunner.dropTable("chat_library_items");
    await queryRunner.dropTable("chat_projects");
  }
}
