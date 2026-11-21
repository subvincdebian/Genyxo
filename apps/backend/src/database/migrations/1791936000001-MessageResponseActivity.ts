import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class MessageResponseActivity1791936000001 implements MigrationInterface {
  name = "MessageResponseActivity1791936000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("messages", [
      new TableColumn({ name: "activity", type: "json", isNullable: true }),
      new TableColumn({ name: "sources", type: "json", isNullable: true }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("messages", "sources");
    await queryRunner.dropColumn("messages", "activity");
  }
}
