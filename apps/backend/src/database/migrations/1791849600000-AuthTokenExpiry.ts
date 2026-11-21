import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class AuthTokenExpiry1791849600000 implements MigrationInterface {
  name = "AuthTokenExpiry1791849600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("users");
    if (!table) throw new Error("users table is required");
    if (!table.findColumnByName("verificationExpires"))
      await queryRunner.query(
        "ALTER TABLE `users` ADD COLUMN `verificationExpires` datetime NULL",
      );
    if (!table.findColumnByName("resetPasswordToken"))
      await queryRunner.query(
        "ALTER TABLE `users` ADD COLUMN `resetPasswordToken` varchar(255) NULL",
      );
    if (!table.findColumnByName("resetPasswordExpires"))
      await queryRunner.query(
        "ALTER TABLE `users` ADD COLUMN `resetPasswordExpires` datetime NULL",
      );
    const updated = await queryRunner.getTable("users");
    if (
      !updated?.indices.some(
        (index) =>
          index.columnNames.length === 1 &&
          index.columnNames[0] === "resetPasswordToken",
      )
    )
      await queryRunner.createIndex(
        "users",
        new TableIndex({
          name: "IDX_users_reset_password_token",
          columnNames: ["resetPasswordToken"],
        }),
      );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("users");
    if (
      table?.indices.some(
        (index) => index.name === "IDX_users_reset_password_token",
      )
    )
      await queryRunner.dropIndex("users", "IDX_users_reset_password_token");
    if (table?.findColumnByName("resetPasswordExpires"))
      await queryRunner.query(
        "ALTER TABLE `users` DROP COLUMN `resetPasswordExpires`",
      );
    if (table?.findColumnByName("resetPasswordToken"))
      await queryRunner.query(
        "ALTER TABLE `users` DROP COLUMN `resetPasswordToken`",
      );
    if (table?.findColumnByName("verificationExpires"))
      await queryRunner.query(
        "ALTER TABLE `users` DROP COLUMN `verificationExpires`",
      );
  }
}
