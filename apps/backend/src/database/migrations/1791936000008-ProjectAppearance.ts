import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/** Projects choose a sidebar icon and colour; null keeps the plain folder. */
export class ProjectAppearance1791936000008 implements MigrationInterface {
  name = "ProjectAppearance1791936000008";
  async up(runner: QueryRunner): Promise<void> {
    await runner.addColumns("chat_projects", [
      new TableColumn({
        name: "icon",
        type: "varchar",
        length: "24",
        isNullable: true,
      }),
      new TableColumn({
        name: "color",
        type: "varchar",
        length: "16",
        isNullable: true,
      }),
    ]);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.dropColumn("chat_projects", "color");
    await runner.dropColumn("chat_projects", "icon");
  }
}
