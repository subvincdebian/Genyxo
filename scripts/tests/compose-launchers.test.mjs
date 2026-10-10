import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const bash =
  process.env.BASH_PATH ||
  (process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash");
const pwsh = process.env.PWSH_PATH || "pwsh";
const hasPwsh =
  spawnSync(pwsh, ["-NoProfile", "-Command", "exit 0"]).status === 0;
const prefix =
  "compose --env-file apps/backend/.env -f docker-compose.yml -f docker-compose.prod.yml";
const shellPath = (value) =>
  value
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);

function fixture(
  t,
  { envFile = true, certificate = true, key = true, failure = "" } = {},
) {
  const dir = mkdtempSync(path.join(tmpdir(), "genyxo-compose-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const subdir of ["scripts", "bin", "apps/backend", "nginx/ssl"])
    mkdirSync(path.join(dir, subdir), { recursive: true });
  for (const script of ["prod.sh", "prod.ps1", "dev.sh", "dev.ps1"])
    cpSync(
      path.join(root, "scripts", script),
      path.join(dir, "scripts", script),
    );
  const envPath = path.join(dir, "apps/backend/.env");
  writeFileSync(
    path.join(dir, "apps/backend/.env.example"),
    "DO_NOT_COPY=fixture\n",
  );
  if (envFile === "directory") mkdirSync(envPath);
  else if (envFile) writeFileSync(envPath, "FAKE_CREDENTIAL=fixture\n");
  if (certificate)
    writeFileSync(path.join(dir, "nginx/ssl/cert.pem"), "fixture\n");
  if (key) writeFileSync(path.join(dir, "nginx/ssl/key.pem"), "fixture\n");
  const log = path.join(dir, "commands.log");
  writeFileSync(log, "");
  writeFileSync(
    path.join(dir, "bin/docker"),
    `#!/usr/bin/env bash
set -eu
printf '%s\\n' "$*" >> "$MOCK_LOG"
if [[ "$MOCK_FAIL" == all ]] ||
   [[ "$MOCK_FAIL" == migration && "$*" == *' run --rm db-migrate' ]] ||
   [[ "$MOCK_FAIL" == config && "$*" == *' config --quiet' ]]; then
  exit 7
fi
`,
    { mode: 0o755 },
  );
  if (process.platform === "win32")
    writeFileSync(
      path.join(dir, "bin/docker.cmd"),
      `@echo off\r\necho %*>>"%MOCK_LOG_WIN%"\r\nif "%MOCK_FAIL%"=="all" exit /b 7\r\nif "%MOCK_FAIL%"=="migration" if "%*"=="%MOCK_PREFIX% run --rm db-migrate" exit /b 7\r\nif "%MOCK_FAIL%"=="config" if "%*"=="%MOCK_PREFIX% config --quiet" exit /b 7\r\nexit /b 0\r\n`,
    );
  const childEnv = {
    ...process.env,
    MOCK_LOG: shellPath(log),
    MOCK_LOG_WIN: log,
    MOCK_FAIL: failure,
    MOCK_PREFIX: prefix,
  };
  const originalPath = process.env.PATH || process.env.Path;
  for (const name of Object.keys(childEnv))
    if (name.toLowerCase() === "path") delete childEnv[name];
  childEnv.PATH = `${path.join(dir, "bin")}${path.delimiter}${originalPath}`;
  return {
    run: (platform, stack = "prod", action = "up") => {
      const script = path.join(
        dir,
        "scripts",
        `${stack}.${platform === "bash" ? "sh" : "ps1"}`,
      );
      return platform === "bash"
        ? spawnSync(
            bash,
            [
              "-c",
              'export PATH="$MOCK_BIN:$PATH"; exec bash "$LAUNCHER" "$ACTION"',
            ],
            {
              env: {
                ...childEnv,
                MOCK_BIN: shellPath(path.join(dir, "bin")),
                LAUNCHER: shellPath(script),
                ACTION: action,
              },
              encoding: "utf8",
              timeout: 60_000,
            },
          )
        : spawnSync(pwsh, ["-NoProfile", "-File", script, "-Action", action], {
            env: childEnv,
            encoding: "utf8",
            timeout: 60_000,
          });
    },
    commands: () =>
      readFileSync(log, "utf8").trim().split(/\r?\n/).filter(Boolean),
    envExists: () => existsSync(envPath),
  };
}

for (const platform of ["bash", "powershell"]) {
  const platformTest = (name, fn) =>
    test(
      `${platform}: ${name}`,
      {
        skip:
          platform === "powershell" &&
          !hasPwsh &&
          "PowerShell unavailable; set PWSH_PATH",
      },
      fn,
    );
  platformTest(
    "production requires explicit credentials without copying example",
    (t) => {
      const f = fixture(t, { envFile: false });
      const result = f.run(platform);
      assert.notEqual(result.status, 0);
      assert.equal(f.envExists(), false);
      assert.deepEqual(f.commands(), []);
    },
  );
  platformTest(
    "production rejects a directory instead of the credentials file",
    (t) => {
      const f = fixture(t, { envFile: "directory" });
      assert.notEqual(f.run(platform).status, 0);
      assert.deepEqual(f.commands(), []);
    },
  );
  for (const missing of ["certificate", "key"]) {
    platformTest(
      `production refuses missing TLS ${missing} before Docker`,
      (t) => {
        const f = fixture(t, { [missing]: false });
        assert.notEqual(f.run(platform).status, 0);
        assert.deepEqual(f.commands(), []);
      },
    );
  }
  platformTest(
    "production validates, builds, migrates, waits, then reports success",
    (t) => {
      const f = fixture(t);
      const result = f.run(platform);
      assert.equal(result.status, 0, result.stderr || String(result.error));
      assert.deepEqual(
        f.commands(),
        [
          "config --quiet",
          "build",
          "up -d mysql redis",
          "run --rm db-migrate",
          "up -d --wait",
          "ps",
        ].map((command) => `${prefix} ${command}`),
      );
      assert.match(result.stdout, /successfully deployed|up and running/);
    },
  );
  platformTest(
    "migration failure propagates its native exit and blocks application rollout",
    (t) => {
      const f = fixture(t, { failure: "migration" });
      const result = f.run(platform);
      assert.equal(result.status, 7, result.stderr || String(result.error));
      assert.deepEqual(
        f.commands(),
        [
          "config --quiet",
          "build",
          "up -d mysql redis",
          "run --rm db-migrate",
        ].map((command) => `${prefix} ${command}`),
      );
      assert.doesNotMatch(
        result.stdout,
        /successfully deployed|up and running/,
      );
    },
  );
  platformTest("invalid compose configuration stops before build", (t) => {
    const f = fixture(t, { failure: "config" });
    assert.equal(f.run(platform).status, 7);
    assert.deepEqual(f.commands(), [`${prefix} config --quiet`]);
  });
  platformTest(
    "production status uses both compose files without requiring TLS",
    (t) => {
      const f = fixture(t, { certificate: false, key: false });
      assert.equal(f.run(platform, "prod", "status").status, 0);
      assert.deepEqual(f.commands(), [`${prefix} ps`]);
    },
  );
  platformTest(
    "development native failure propagates without announcing success",
    (t) => {
      const f = fixture(t, { failure: "all" });
      const result = f.run(platform, "dev");
      assert.equal(result.status, 7, result.stderr || String(result.error));
      assert.deepEqual(f.commands(), [
        "compose --env-file apps/backend/.env -f docker-compose.dev.yml up --build -d",
      ]);
      assert.doesNotMatch(
        result.stdout,
        /started successfully|Stack is running/,
      );
    },
  );
  platformTest("invalid actions fail before Docker", (t) => {
    const f = fixture(t);
    assert.notEqual(f.run(platform, "prod", "invalid").status, 0);
    assert.notEqual(f.run(platform, "dev", "invalid").status, 0);
    assert.deepEqual(f.commands(), []);
  });
}
