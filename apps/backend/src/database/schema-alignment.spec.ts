import {
  DataSource,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm";
import { AlignBaselineWithEntities1791763200000 } from "./migrations/1791763200000-AlignBaselineWithEntities";

const additions = [
  "requestId",
  "type",
  "referrerId",
  "referralBalance",
  "referralCode",
  "isReferralPaid",
];

function fixture(aligned = false) {
  // Use the real QueryRunner type without casting a partial mock to its contract.
  const runner = new DataSource({ type: "mysql" }).createQueryRunner();
  const users = new Table({
    name: "users",
    columns: [
      {
        name: "credits",
        type: aligned ? "decimal" : "int",
        precision: aligned ? 10 : undefined,
        scale: aligned ? 2 : undefined,
        default: aligned ? "'0.00'" : "50",
      },
    ],
  });
  const messages = new Table({
    name: "messages",
    columns: [{ name: "conversationId", type: "int" }],
    foreignKeys: [
      new TableForeignKey({
        name: "FK_messages_conversation",
        columnNames: ["conversationId"],
        referencedColumnNames: ["id"],
        referencedTableName: aligned ? "conversation" : "conversations",
        onDelete: "CASCADE",
      }),
    ],
  });
  if (aligned) {
    additions.forEach((name) =>
      users.addColumn(new TableColumn({ name, type: "varchar" })),
    );
    users.indices.push(
      new TableIndex({
        name: "existing_unique",
        columnNames: ["referralCode"],
        isUnique: true,
      }),
      new TableIndex({ name: "existing_index", columnNames: ["referrerId"] }),
    );
    users.foreignKeys.push(
      new TableForeignKey({
        columnNames: ["referrerId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
      }),
    );
  }
  const getTable = jest
    .spyOn(runner, "getTable")
    .mockImplementation((name) =>
      Promise.resolve(
        name === "users" ? users : name === "messages" ? messages : undefined,
      ),
    );
  const hasTable = jest
    .spyOn(runner, "hasTable")
    .mockImplementation((name) =>
      Promise.resolve(aligned || name === "conversations"),
    );
  const query = jest.spyOn(runner, "query").mockResolvedValue([{ count: 0 }]);
  const dropForeignKey = jest
    .spyOn(runner, "dropForeignKey")
    .mockResolvedValue();
  const createForeignKey = jest
    .spyOn(runner, "createForeignKey")
    .mockResolvedValue();
  return {
    runner,
    users,
    messages,
    getTable,
    hasTable,
    query,
    dropForeignKey,
    createForeignKey,
  };
}

describe("baseline schema alignment", () => {
  const migration = new AlignBaselineWithEntities1791763200000();

  it("renames the baseline parent without dropping tables, rows, columns or an automatically updated foreign key", async () => {
    const f = fixture();
    await migration.up(f.runner);
    const statements = f.query.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain(
      "RENAME TABLE `conversations` TO `conversation`",
    );
    expect(statements).toContain(
      "ALTER TABLE `users` MODIFY COLUMN `credits` decimal(10,2) NOT NULL DEFAULT 0",
    );
    expect(statements.filter((sql) => sql.includes("ADD COLUMN"))).toHaveLength(
      6,
    );
    expect(statements.join(" ")).not.toMatch(/DROP|DELETE|TRUNCATE/);
    expect(f.dropForeignKey).not.toHaveBeenCalled();
  });

  it("leaves the actual aligned schema and empty legacy plural table untouched", async () => {
    const f = fixture(true);
    await migration.up(f.runner);
    expect(f.query.mock.calls.map(([sql]) => String(sql))).toEqual([
      "SELECT COUNT(*) AS count FROM `conversations`",
    ]);
    expect(f.createForeignKey).not.toHaveBeenCalled();
    expect(f.dropForeignKey).not.toHaveBeenCalled();
  });

  it("fails safely if both conversation tables exist and the legacy table contains data", async () => {
    const f = fixture(true);
    f.query.mockResolvedValue([{ count: 2 }]);
    await expect(migration.up(f.runner)).rejects.toThrow(
      /Both conversation tables/,
    );
    expect(f.query).toHaveBeenCalledTimes(1);
    expect(f.dropForeignKey).not.toHaveBeenCalled();
  });

  it("rejects balances that would be rounded or exceed decimal capacity before DDL", async () => {
    const f = fixture();
    f.query.mockResolvedValue([{ count: 1 }]);
    await expect(migration.up(f.runner)).rejects.toThrow(/represented exactly/);
    expect(
      f.query.mock.calls.every(([sql]) => String(sql).startsWith("SELECT")),
    ).toBe(true);
  });

  it("rejects orphan messages before dropping a foreign key", async () => {
    const f = fixture(true);
    f.messages.foreignKeys[0].referencedTableName = "conversations";
    f.query
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 1 }]);
    await expect(migration.up(f.runner)).rejects.toThrow(
      /missing conversations/,
    );
    expect(f.dropForeignKey).not.toHaveBeenCalled();
  });

  it("repairs a constraint on retry after TiDB commits its drop and the following DDL fails", async () => {
    const f = fixture(true);
    f.messages.foreignKeys[0].referencedTableName = "conversations";
    f.dropForeignKey.mockImplementation(() => {
      f.messages.foreignKeys.length = 0;
      return Promise.resolve();
    });
    f.createForeignKey.mockRejectedValueOnce(
      new Error("connection interrupted"),
    );
    await expect(migration.up(f.runner)).rejects.toThrow(
      "connection interrupted",
    );
    await migration.up(f.runner);
    expect(f.dropForeignKey).toHaveBeenCalledTimes(1);
    expect(f.createForeignKey).toHaveBeenCalledTimes(2);
    expect(f.createForeignKey.mock.calls[1][1]).toMatchObject({
      referencedTableName: "conversation",
      onDelete: "CASCADE",
    });
  });

  it("does not add an already committed column again after a DDL interruption", async () => {
    const f = fixture(true);
    f.users.columns = f.users.columns.filter(
      (column) => column.name !== "requestId" && column.name !== "type",
    );
    f.query.mockImplementation((sql: string) => {
      if (sql.includes("ADD COLUMN `requestId`")) {
        f.users.addColumn(
          new TableColumn({ name: "requestId", type: "varchar" }),
        );
        return Promise.resolve([]);
      }
      if (sql.includes("ADD COLUMN `type`"))
        return Promise.reject(new Error("DDL interrupted"));
      return Promise.resolve([{ count: 0 }]);
    });
    await expect(migration.up(f.runner)).rejects.toThrow("DDL interrupted");
    f.query.mockResolvedValue([{ count: 0 }]);
    await migration.up(f.runner);
    expect(
      f.query.mock.calls.filter(([sql]) =>
        String(sql).includes("ADD COLUMN `requestId`"),
      ),
    ).toHaveLength(1);
    expect(
      f.query.mock.calls.filter(([sql]) =>
        String(sql).includes("ADD COLUMN `type`"),
      ),
    ).toHaveLength(2);
  });

  it("does not offer a destructive automatic rollback", async () => {
    await expect(migration.down()).rejects.toThrow(/forward-only/);
  });
});
