import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import test from "node:test";

const script = fileURLToPath(new URL("../db-backup.sh", import.meta.url));
const bash =
  process.env.BASH_PATH ||
  (process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash");
const shellPath = (value) =>
  value
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
const secret = "fixture-password-$; with spaces";

function fixture(t, overrides = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "genyxo-backup-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = path.join(dir, "bin");
  const output = path.join(dir, "backups with spaces");
  const log = path.join(dir, "commands.log");
  mkdirSync(bin);
  mkdirSync(output);
  writeFileSync(log, "");
  const old = path.join(output, "genyxo_backup_old.sql.gz");
  writeFileSync(old, "existing backup");
  const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  utimesSync(old, past, past);
  const unrelated = path.join(output, "unrelated.sql.gz");
  writeFileSync(unrelated, "unrelated archive");
  utimesSync(unrelated, past, past);
  writeFileSync(
    path.join(bin, "docker"),
    `#!/usr/bin/env bash
set -eu
printf 'docker arg: %s\\n' "$@" >> "$MOCK_LOG"
case "$1" in
  ps)
    [[ "$MOCK_FAILURE" != ps ]] || exit 13
    printf '%s\\n' "$MOCK_CONTAINERS"
    ;;
  exec)
    [[ "$MOCK_FAILURE" != docker ]] || { printf 'partial dump'; exit 14; }
    [[ "$2" == "$MYSQL_CONTAINER" ]] || exit 15
    shift 2
    export MYSQL_ROOT_PASSWORD="$MOCK_SECRET"
    exec "$@"
    ;;
  *) exit 16 ;;
esac
`,
    { mode: 0o755 },
  );
  writeFileSync(
    path.join(bin, "mysqldump"),
    `#!/usr/bin/env bash
set -eu
printf 'mysqldump arg: %s\\n' "$@" >> "$MOCK_LOG"
[[ "$MYSQL_PWD" == "$MOCK_SECRET" ]] || exit 17
printf '%s\\n' 'fixture SQL dump'
[[ "$MOCK_FAILURE" != dump ]] || exit 18
`,
    { mode: 0o755 },
  );
  if (overrides.MOCK_FAILURE === "gzip") {
    writeFileSync(
      path.join(bin, "gzip"),
      "#!/usr/bin/env bash\nprintf 'partial gzip'\ncat >/dev/null\nexit 19\n",
      { mode: 0o755 },
    );
  }
  return {
    output,
    old,
    unrelated,
    files: () => readdirSync(output).sort(),
    commands: () => readFileSync(log, "utf8"),
    run: () =>
      spawnSync(
        bash,
        ["-c", 'export PATH="$MOCK_BIN:$PATH"; exec bash "$BACKUP_SCRIPT"'],
        {
          env: {
            ...process.env,
            MOCK_BIN: shellPath(bin),
            MOCK_LOG: shellPath(log),
            MOCK_FAILURE: "",
            MOCK_CONTAINERS: "genyxo-mysql",
            MOCK_SECRET: secret,
            MYSQL_CONTAINER: "genyxo-mysql",
            MYSQL_DATABASE: "fixture database",
            MYSQLDATABASE: "fallback database",
            BACKUP_DIR: shellPath(output),
            BACKUP_SCRIPT: shellPath(script),
            RETENTION_DAYS: "14",
            ...overrides,
          },
          encoding: "utf8",
          timeout: 60_000,
        },
      ),
  };
}

test("backs up the selected database, publishes gzip and then applies retention", (t) => {
  const f = fixture(t);
  for (let run = 0; run < 2; run++) {
    const result = f.run();
    assert.equal(result.status, 0, result.stderr || String(result.error));
    assert.doesNotMatch(
      result.stdout + result.stderr + f.commands(),
      new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
  const archives = f
    .files()
    .filter((name) => name.startsWith("genyxo_backup_"));
  assert.equal(
    archives.length,
    2,
    "successive backups must preserve each archive",
  );
  for (const archive of archives) {
    assert.match(archive, /^genyxo_backup_\d{8}_\d{6}_.+\.sql\.gz$/);
    assert.equal(
      gunzipSync(readFileSync(path.join(f.output, archive))).toString(),
      "fixture SQL dump\n",
    );
  }
  assert.equal(readFileSync(f.unrelated, "utf8"), "unrelated archive");
  assert.match(
    f.commands(),
    /mysqldump arg: --databases\nmysqldump arg: fixture database\n/,
  );
  assert.doesNotMatch(
    f.commands(),
    /mysqldump arg: --all-databases|mysqldump arg: -p/,
  );
  assert.equal(
    f.files().some((name) => name.endsWith(".tmp")),
    false,
  );
});

test("uses MYSQLDATABASE when MYSQL_DATABASE is empty", (t) => {
  const f = fixture(t, { MYSQL_DATABASE: "" });
  assert.equal(f.run().status, 0);
  assert.match(f.commands(), /mysqldump arg: fallback database\n/);
});

for (const failure of ["ps", "docker", "dump", "gzip"]) {
  test(`${failure} failure removes temporary output and preserves existing archives`, (t) => {
    const f = fixture(t, { MOCK_FAILURE: failure });
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.deepEqual(f.files(), [
      "genyxo_backup_old.sql.gz",
      "unrelated.sql.gz",
    ]);
    assert.equal(readFileSync(f.old, "utf8"), "existing backup");
    assert.equal(
      (result.stdout + result.stderr + f.commands()).includes(secret),
      false,
    );
  });
}

for (const containers of ["", "genyxo-mysql-other", "genyxoXmysql"]) {
  test(`rejects an absent exact container with inventory ${JSON.stringify(containers)}`, (t) => {
    const f = fixture(t, {
      MYSQL_CONTAINER: "genyxo.mysql",
      MOCK_CONTAINERS: containers,
    });
    const result = f.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /is not running/);
    assert.doesNotMatch(f.commands(), /docker arg: exec/);
    assert.deepEqual(f.files(), [
      "genyxo_backup_old.sql.gz",
      "unrelated.sql.gz",
    ]);
  });
}

test("matches a container name containing regex punctuation literally", (t) => {
  const f = fixture(t, {
    MYSQL_CONTAINER: "genyxo.mysql",
    MOCK_CONTAINERS: "another\ngenyxo.mysql",
  });
  assert.equal(f.run().status, 0);
});

for (const retention of ["", "-1", "1.5", "abc", "1 -delete"]) {
  test(`rejects invalid retention ${JSON.stringify(retention)} before docker or cleanup`, (t) => {
    const f = fixture(t, { RETENTION_DAYS: retention });
    const result = f.run();
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /RETENTION_DAYS must be a non-negative integer/,
    );
    assert.equal(f.commands(), "");
    assert.deepEqual(f.files(), [
      "genyxo_backup_old.sql.gz",
      "unrelated.sql.gz",
    ]);
  });
}
