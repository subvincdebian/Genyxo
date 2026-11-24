import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/** Replies keep the Auto-mode route and the fact-check result. */
export class MessageMeta1791936000013 implements MigrationInterface {
  name = "MessageMeta1791936000013";
  async up(runner: QueryRunner): Promise<void> {
    if (await runner.hasColumn("messages", "meta")) return;
    await runner.addColumn(
      "messages",
      new TableColumn({ name: "meta", type: "json", isNullable: true }),
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.dropColumn("messages", "meta");
  }
}
