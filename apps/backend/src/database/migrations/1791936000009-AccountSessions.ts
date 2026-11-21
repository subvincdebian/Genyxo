import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AccountSessions1791936000009 implements MigrationInterface {
  name = "AccountSessions1791936000009";
  async up(runner: QueryRunner): Promise<void> {
    if (!(await runner.hasColumn("users", "sessionVersion")))
      await runner.addColumn(
        "users",
        new TableColumn({ name: "sessionVersion", type: "int", default: 0 }),
      );
    // TypeORM changeColumn drops/recreates columns on a type change in MySQL.
    // MODIFY preserves every existing ledger value.
    await runner.query(
      "ALTER TABLE `transactions` MODIFY COLUMN `creditsAmount` DECIMAL(12,2) NOT NULL",
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    const rows = await runner.query(
      "SELECT COUNT(*) AS fractional FROM `transactions` WHERE `creditsAmount` <> TRUNCATE(`creditsAmount`, 0)",
    );
    if (Number(rows[0]?.fractional))
      throw new Error(
        "Cannot revert account ledger precision while fractional entries exist.",
      );
    await runner.query(
      "ALTER TABLE `transactions` MODIFY COLUMN `creditsAmount` INT NOT NULL",
    );
    await runner.dropColumn("users", "sessionVersion");
  }
}
