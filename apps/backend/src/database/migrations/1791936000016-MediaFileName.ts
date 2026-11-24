import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/** Files produced by the code sandbox keep their download name. */
export class MediaFileName1791936000016 implements MigrationInterface {
  name = "MediaFileName1791936000016";
  async up(runner: QueryRunner) {
    if (await runner.hasColumn("generated_media", "fileName")) return;
    await runner.addColumn(
      "generated_media",
      new TableColumn({
        name: "fileName",
        type: "varchar",
        length: "200",
        isNullable: true,
      }),
    );
  }
  async down(runner: QueryRunner) {
    await runner.dropColumn("generated_media", "fileName");
  }
}
