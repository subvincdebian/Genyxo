import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
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
const shellPath = (value) =>
  value
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);

function fixture(t, { existing = [], behavior = "success" } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "genyxo dev certificates "));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const ssl = path.join(dir, "nginx", "ssl");
  const bin = path.join(dir, "bin");
  mkdirSync(ssl, { recursive: true });
  mkdirSync(bin);
  for (const suffix of ["ps1", "sh"])
    cpSync(
      path.join(root, "nginx", `generate-dev-certs.${suffix}`),
      path.join(dir, "nginx", `generate-dev-certs.${suffix}`),
    );
  for (const file of existing)
    writeFileSync(path.join(ssl, file), "existing certificate fixture\n");
  const log = path.join(dir, "openssl.json");
  const helper = path.join(dir, "openssl-mock.cjs");
  writeFileSync(
    helper,
    `const fs=require('node:fs'); const args=process.argv.slice(2); fs.writeFileSync(process.env.MOCK_LOG,JSON.stringify(args)); const out=args[args.indexOf('-out')+1], key=args[args.indexOf('-keyout')+1]; fs.writeFileSync(key,'fixture key'); if(process.env.MOCK_BEHAVIOR==='failure') process.exit(7); if(process.env.MOCK_BEHAVIOR!=='missing-output') fs.writeFileSync(out,'fixture cert');`,
  );
  writeFileSync(
    path.join(bin, "openssl"),
    '#!/usr/bin/env bash\nexec "$MOCK_NODE" "$MOCK_HELPER" "$@"\n',
    { mode: 0o755 },
  );
  if (process.platform === "win32")
    writeFileSync(
      path.join(bin, "openssl.cmd"),
      '@echo off\r\n"%MOCK_NODE_WIN%" "%MOCK_HELPER_WIN%" %*\r\nexit /b %ERRORLEVEL%\r\n',
    );
  const env = {
    ...process.env,
    MOCK_NODE: shellPath(process.execPath),
    MOCK_NODE_WIN: process.execPath,
    MOCK_HELPER: shellPath(helper),
    MOCK_HELPER_WIN: helper,
    MOCK_LOG: log,
    MOCK_BEHAVIOR: behavior,
  };
  const originalPath = process.env.PATH || process.env.Path;
  for (const key of Object.keys(env))
    if (key.toLowerCase() === "path") delete env[key];
  env.PATH = `${bin}${path.delimiter}${originalPath}`;
  return {
    run(platform) {
      const script = path.join(
        dir,
        "nginx",
        `generate-dev-certs.${platform === "bash" ? "sh" : "ps1"}`,
      );
      return platform === "bash"
        ? spawnSync(
            bash,
            ["-c", 'export PATH="$MOCK_BIN:$PATH"; exec bash "$CERT_SCRIPT"'],
            {
              env: {
                ...env,
                MOCK_BIN: shellPath(bin),
                CERT_SCRIPT: shellPath(script),
              },
              encoding: "utf8",
              timeout: 60_000,
            },
          )
        : spawnSync(pwsh, ["-NoProfile", "-File", script], {
            env,
            encoding: "utf8",
            timeout: 60_000,
          });
    },
    ssl,
    log,
    remaining: () => readdirSync(ssl).sort(),
  };
}

for (const platform of ["bash", "powershell"]) {
  const certTest = (name, fn) =>
    test(
      `${platform}: ${name}`,
      {
        skip: platform === "powershell" && !hasPwsh && "PowerShell unavailable",
      },
      fn,
    );
  certTest(
    "generates a complete local certificate pair in a path with spaces",
    (t) => {
      const f = fixture(t);
      const result = f.run(platform);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(f.remaining(), ["cert.pem", "key.pem"]);
      assert.match(result.stdout, /certificates generated/);
      assert.ok(
        JSON.parse(readFileSync(f.log, "utf8")).includes(
          "subjectAltName=DNS:localhost,IP:127.0.0.1",
        ),
      );
    },
  );
  certTest("OpenSSL failure cannot publish files or announce success", (t) => {
    const f = fixture(t, { behavior: "failure" });
    const result = f.run(platform);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /certificates generated/);
    assert.deepEqual(f.remaining(), []);
  });
  certTest("missing OpenSSL output fails and cleans the temporary key", (t) => {
    const f = fixture(t, { behavior: "missing-output" });
    const result = f.run(platform);
    assert.notEqual(result.status, 0);
    assert.deepEqual(f.remaining(), []);
  });
  certTest("an existing pair is preserved without calling OpenSSL", (t) => {
    const f = fixture(t, { existing: ["cert.pem", "key.pem"] });
    const result = f.run(platform);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(f.log), false);
    for (const file of f.remaining())
      assert.equal(
        readFileSync(path.join(f.ssl, file), "utf8"),
        "existing certificate fixture\n",
      );
  });
  certTest(
    "an incomplete existing pair is preserved and requires inspection",
    (t) => {
      const f = fixture(t, { existing: ["key.pem"] });
      const result = f.run(platform);
      assert.notEqual(result.status, 0);
      assert.equal(existsSync(f.log), false);
      assert.deepEqual(f.remaining(), ["key.pem"]);
      assert.equal(
        readFileSync(path.join(f.ssl, "key.pem"), "utf8"),
        "existing certificate fixture\n",
      );
    },
  );
}
