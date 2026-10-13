import dataSource from "./data-source";
import { runMigrationCli, runMigrationsWithLock } from "./runner";

jest.mock("./data-source", () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    createQueryRunner: jest.fn(),
    runMigrations: jest.fn(),
    destroy: jest.fn(),
    isInitialized: false,
  },
}));

describe("migration advisory lock", () => {
  const events: string[] = [];
  const connection = {
    connect: jest.fn(),
    query: jest.fn(),
    release: jest.fn(),
  };
  const source = jest.mocked(dataSource);
  let initialized = false;
  let previousExitCode: typeof process.exitCode;

  beforeEach(() => {
    jest.resetAllMocks();
    events.length = 0;
    previousExitCode = process.exitCode;
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    initialized = false;
    Object.defineProperty(source, "isInitialized", {
      get: () => initialized,
      configurable: true,
    });
    source.initialize.mockImplementation(() => {
      initialized = true;
      events.push("initialize");
      return Promise.resolve(source);
    });
    // A production QueryRunner has many unrelated transaction methods. The
    // factory mock supplies only the connection lifecycle used by this runner.
    Object.defineProperty(source, "createQueryRunner", {
      value: jest.fn(() => connection),
      configurable: true,
    });
    connection.connect.mockImplementation(() => {
      events.push("connect");
      return Promise.resolve();
    });
    connection.query.mockImplementation((sql: string) => {
      const acquire = sql.includes("GET_LOCK");
      events.push(acquire ? "acquire" : "unlock");
      return Promise.resolve(acquire ? [{ locked: 1 }] : [{ released: 1 }]);
    });
    source.runMigrations.mockImplementation(() => {
      events.push("migrate");
      return Promise.resolve([]);
    });
    connection.release.mockImplementation(() => {
      events.push("release");
      return Promise.resolve();
    });
    source.destroy.mockImplementation(() => {
      events.push("destroy");
      initialized = false;
      return Promise.resolve();
    });
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
    jest.restoreAllMocks();
  });

  it("holds a dedicated master connection through migrations and unlocks it before cleanup", async () => {
    await runMigrationsWithLock();
    expect(source.createQueryRunner.mock.calls).toEqual([["master"]]);
    expect(connection.query).toHaveBeenNthCalledWith(
      1,
      "SELECT GET_LOCK(?, ?) AS locked",
      ["genyxo_db_migration_lock", 60],
    );
    expect(connection.query).toHaveBeenNthCalledWith(
      2,
      "SELECT RELEASE_LOCK(?)",
      ["genyxo_db_migration_lock"],
    );
    expect(events).toEqual([
      "initialize",
      "connect",
      "acquire",
      "migrate",
      "unlock",
      "release",
      "destroy",
    ]);
  });

  it.each([0, null, undefined])(
    "rejects unavailable lock %s without starting migrations",
    async (locked) => {
      connection.query.mockResolvedValueOnce([{ locked }]);
      await expect(runMigrationsWithLock()).rejects.toThrow(/migration lock/);
      expect(source.runMigrations.mock.calls).toHaveLength(0);
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);
      expect(source.destroy.mock.calls).toHaveLength(1);
    },
  );

  it("unlocks and cleans up after a migration failure without exiting during cleanup", async () => {
    source.runMigrations.mockRejectedValueOnce(new Error("migration failed"));
    await expect(runMigrationsWithLock()).rejects.toThrow("migration failed");
    expect(events.slice(-3)).toEqual(["unlock", "release", "destroy"]);
  });

  it("destroys the data source after connection failure", async () => {
    connection.connect.mockRejectedValueOnce(new Error("connection failed"));
    await expect(runMigrationsWithLock()).rejects.toThrow("connection failed");
    expect(source.runMigrations.mock.calls).toHaveLength(0);
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(source.destroy.mock.calls).toHaveLength(1);
  });

  it("still returns the connection and destroys the source if unlocking fails", async () => {
    connection.query
      .mockResolvedValueOnce([{ locked: "1" }])
      .mockRejectedValueOnce(new Error("unlock failed"));
    await expect(runMigrationsWithLock()).rejects.toThrow("unlock failed");
    expect(events.slice(-2)).toEqual(["release", "destroy"]);
  });

  it("CLI returns failure after cleanup without logging raw database details", async () => {
    source.runMigrations.mockRejectedValueOnce(
      new Error("private-password and raw SQL"),
    );
    await runMigrationCli();
    expect(process.exitCode).toBe(1);
    expect(events.slice(-3)).toEqual(["unlock", "release", "destroy"]);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(jest.mocked(console.error).mock.calls.flat().join(" ")).not.toMatch(
      /private-password|raw SQL/,
    );
  });
});
