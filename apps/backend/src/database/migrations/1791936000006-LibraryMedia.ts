import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/** Library items made from generated media remember their source chat. */
export class LibraryMedia1791936000006 implements MigrationInterface {
  name = "LibraryMedia1791936000006";
  async up(runner: QueryRunner): Promise<void> {
    await runner.addColumn(
      "chat_library_items",
      new TableColumn({
        name: "conversationId",
        type: "int",
        isNullable: true,
      }),
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.dropColumn("chat_library_items", "conversationId");
  }
}
