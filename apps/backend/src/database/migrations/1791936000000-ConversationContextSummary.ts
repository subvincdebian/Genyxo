import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class ConversationContextSummary1791936000000 implements MigrationInterface {
  name = "ConversationContextSummary1791936000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("conversation", [
      new TableColumn({
        name: "contextSummary",
        type: "mediumtext",
        isNullable: true,
      }),
      new TableColumn({
        name: "summaryThroughMessageId",
        type: "int",
        default: 0,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("conversation", "summaryThroughMessageId");
    await queryRunner.dropColumn("conversation", "contextSummary");
  }
}
