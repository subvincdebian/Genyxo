import { MigrationInterface, QueryRunner, TableForeignKey } from "typeorm";

async function count(queryRunner: QueryRunner, sql: string): Promise<number> {
  const result: unknown = await queryRunner.query(sql);
  const row: unknown = Array.isArray(result) ? result[0] : undefined;
  if (typeof row !== "object" || row === null || !("count" in row)) {
    throw new Error("Schema alignment preflight returned an invalid count.");
  }
  const value = Number(row.count);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Schema alignment preflight returned an invalid count.");
  }
  return value;
}

export class AlignBaselineWithEntities1791763200000 implements MigrationInterface {
  name = "AlignBaselineWithEntities1791763200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const users = await queryRunner.getTable("users");
    const singular = await queryRunner.hasTable("conversation");
    const plural = await queryRunner.hasTable("conversations");
    if (!users || (!singular && !plural)) {
      throw new Error(
        "Schema alignment requires the baseline users and conversation tables.",
      );
    }
    // The live application used the singular table before the baseline existed.
    // Never merge two sets of conversation IDs or silently overwrite their data.
    if (
      singular &&
      plural &&
      (await count(
        queryRunner,
        "SELECT COUNT(*) AS count FROM `conversations`",
      )) > 0
    ) {
      throw new Error(
        "Both conversation tables exist and conversations contains data. Resolve their ownership before migrating.",
      );
    }

    const credits = users.findColumnByName("credits");
    if (!credits) throw new Error("Schema alignment requires users.credits.");
    const changeCreditsType =
      credits.type !== "decimal" ||
      credits.precision !== 10 ||
      credits.scale !== 2;
    if (
      changeCreditsType &&
      (await count(
        queryRunner,
        "SELECT COUNT(*) AS count FROM `users` WHERE `credits` < -99999999.99 OR `credits` > 99999999.99 OR `credits` IS NULL OR `credits` <> ROUND(`credits`, 2)",
      )) > 0
    ) {
      throw new Error(
        "Existing credits cannot be represented exactly as decimal(10,2). No balances were changed.",
      );
    }

    const messages = await queryRunner.getTable("messages");
    if (!messages)
      throw new Error("Schema alignment requires the messages table.");
    const conversationKeys = messages.foreignKeys.filter((key) =>
      key.columnNames.includes("conversationId"),
    );
    if (
      conversationKeys.some(
        (key) =>
          !["conversation", "conversations"].includes(key.referencedTableName),
      )
    ) {
      throw new Error(
        "Unexpected messages.conversationId foreign key. Resolve it before migrating.",
      );
    }
    if (!singular) {
      // MySQL/TiDB update referencing foreign keys when their parent is renamed.
      await queryRunner.query("RENAME TABLE `conversations` TO `conversation`");
    }
    if (
      !conversationKeys.some(
        (key) =>
          key.referencedTableName === "conversation" ||
          (!singular && key.referencedTableName === "conversations"),
      )
    ) {
      if (
        (await count(
          queryRunner,
          "SELECT COUNT(*) AS count FROM `messages` m LEFT JOIN `conversation` c ON c.id = m.conversationId WHERE c.id IS NULL",
        )) > 0
      ) {
        throw new Error(
          "Messages reference missing conversations. No foreign keys were changed.",
        );
      }
      // DDL commits independently in TiDB. A retry also repairs a failure between
      // dropping the old constraint and creating the canonical one.
      for (const key of conversationKeys)
        await queryRunner.dropForeignKey(messages, key);
      await queryRunner.createForeignKey(
        messages,
        new TableForeignKey({
          name: "FK_messages_conversation",
          columnNames: ["conversationId"],
          referencedColumnNames: ["id"],
          referencedTableName: "conversation",
          onDelete: "CASCADE",
        }),
      );
    }

    const columns = [
      ["requestId", "varchar(255) NULL"],
      ["type", "varchar(255) NOT NULL DEFAULT 'text'"],
      ["referrerId", "int NULL"],
      ["referralBalance", "decimal(10,2) NOT NULL DEFAULT 0"],
      ["referralCode", "varchar(20) NULL"],
      ["isReferralPaid", "tinyint NOT NULL DEFAULT 0"],
    ];
    for (const [name, definition] of columns) {
      if (!users.findColumnByName(name)) {
        await queryRunner.query(
          `ALTER TABLE \`users\` ADD COLUMN \`${name}\` ${definition}`,
        );
      }
    }
    if (changeCreditsType) {
      await queryRunner.query(
        "ALTER TABLE `users` MODIFY COLUMN `credits` decimal(10,2) NOT NULL DEFAULT 0",
      );
    } else if (Number(String(credits.default).replace(/'/g, "")) !== 0) {
      await queryRunner.query(
        "ALTER TABLE `users` ALTER COLUMN `credits` SET DEFAULT 0",
      );
    }

    if (
      !users.indices.some(
        (index) =>
          index.columnNames.length === 1 &&
          index.columnNames[0] === "referralCode" &&
          index.isUnique,
      )
    ) {
      await queryRunner.query(
        "ALTER TABLE `users` ADD UNIQUE INDEX `UQ_users_referralCode` (`referralCode`)",
      );
    }
    if (!users.indices.some((index) => index.columnNames[0] === "referrerId")) {
      await queryRunner.query(
        "ALTER TABLE `users` ADD INDEX `IDX_users_referrerId` (`referrerId`)",
      );
    }
    if (
      !users.foreignKeys.some(
        (key) =>
          key.columnNames.includes("referrerId") &&
          key.referencedTableName === "users",
      )
    ) {
      await queryRunner.createForeignKey(
        "users",
        new TableForeignKey({
          name: "FK_users_referrer",
          columnNames: ["referrerId"],
          referencedColumnNames: ["id"],
          referencedTableName: "users",
        }),
      );
    }
  }

  public down(): Promise<void> {
    // Removing referral fields or reducing credit precision would lose data.
    return Promise.reject(
      new Error(
        "Schema alignment is forward-only. Restore a verified backup to roll it back.",
      ),
    );
  }
}
