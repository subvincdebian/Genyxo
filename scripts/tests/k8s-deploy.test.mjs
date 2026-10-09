import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
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
const shellPath = (value) =>
  value
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);

function fixture(t, { secret = true, failure = "" } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "genyxo-deploy-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(path.join(dir, "scripts"));
  mkdirSync(path.join(dir, "bin"));
  cpSync(path.join(root, "k8s"), path.join(dir, "k8s"), {
    recursive: true,
    filter: (source) => path.basename(source) !== "02-secret.yaml",
  });
  const secretFile = path.join(dir, "k8s", "02-secret.yaml");
  // Never copy or inspect real production credentials in a test fixture.
  rmSync(secretFile, { force: true });
  if (secret)
    writeFileSync(
      secretFile,
      "apiVersion: v1\nkind: Secret\nmetadata:\n  name: genyxo-secrets\n",
    );
  const script = path.join(dir, "scripts", "k8s-deploy.sh");
  cpSync(path.join(root, "scripts", "k8s-deploy.sh"), script);
  const log = path.join(dir, "commands.log");
  writeFileSync(log, "");
  writeFileSync(
    path.join(dir, "bin", "kubectl"),
    `#!/usr/bin/env bash
set -eu
printf '%s\\n' "$*" >> "$MOCK_LOG"
if [[ "$MOCK_FAILURE" == 'secret-apply' && "$1" == 'apply' && "$2" == '-f' && "$3" == */02-secret.yaml ]] ||
   [[ -n "$MOCK_FAILURE" && "$*" == *"$MOCK_FAILURE"* ]]; then
  echo 'mock failure: sensitive-manifest-value' >&2
  exit 1
fi
`,
    { mode: 0o755 },
  );
  return {
    run: () =>
      spawnSync(
        bash,
        ["-c", 'export PATH="$MOCK_BIN:$PATH"; exec bash "$DEPLOY_SCRIPT"'],
        {
          env: {
            ...process.env,
            MOCK_BIN: shellPath(path.join(dir, "bin")),
            MOCK_LOG: shellPath(log),
            MOCK_FAILURE: failure,
            DEPLOY_SCRIPT: shellPath(script),
          },
          encoding: "utf8",
          timeout: 10_000,
        },
      ),
    commands: () =>
      readFileSync(log, "utf8").trim().split("\n").filter(Boolean),
  };
}

const mutating = (commands) =>
  commands.filter((command) => !command.includes("--dry-run=client"));
const workloadApplied = (commands) =>
  commands.some(
    (command) =>
      command.startsWith("apply ") &&
      !command.includes("--dry-run=client") &&
      /03-|04-services/.test(command),
  );

test("missing production secrets fails before any kubectl command", (t) => {
  const f = fixture(t, { secret: false });
  const result = f.run();
  assert.equal(result.status, 1, result.stderr);
  assert.deepEqual(f.commands(), []);
  assert.match(result.stderr, /secret manifest.*required/);
});

test("all workload manifests are validated before mutations", (t) => {
  const f = fixture(t, { failure: "03-backend-deployment.yaml" });
  assert.equal(f.run().status, 1);
  assert.deepEqual(mutating(f.commands()), []);
});

test("secret validation errors are hidden and block mutations", (t) => {
  const f = fixture(t, { failure: "02-secret.yaml" });
  const result = f.run();
  assert.equal(result.status, 1);
  assert.deepEqual(mutating(f.commands()), []);
  assert.doesNotMatch(
    result.stdout + result.stderr,
    /sensitive-manifest-value/,
  );
});

test("secret application errors are hidden and block migration and workloads", (t) => {
  const f = fixture(t, { failure: "secret-apply" });
  const result = f.run();
  assert.equal(result.status, 1);
  assert.equal(workloadApplied(f.commands()), false);
  assert.equal(
    f
      .commands()
      .some((command) => /^(delete|create|wait|rollout) /.test(command)),
    false,
  );
  assert.doesNotMatch(
    result.stdout + result.stderr,
    /sensitive-manifest-value/,
  );
});

for (const failure of [
  "delete job/",
  "create -f",
  "wait --for=condition=complete",
]) {
  test(`${failure} failure blocks workload deployment and rollout`, (t) => {
    const f = fixture(t, { failure });
    assert.equal(f.run().status, 1);
    assert.equal(workloadApplied(f.commands()), false);
    assert.equal(
      f.commands().some((command) => command.startsWith("rollout ")),
      false,
    );
  });
}

test("each deployment recreates and waits for migration before workload apply", (t) => {
  const f = fixture(t);
  for (let run = 0; run < 2; run++) {
    const offset = f.commands().length;
    const result = f.run();
    assert.equal(result.status, 0, result.stderr || String(result.error));
    const commands = f.commands().slice(offset);
    const policy = commands.findIndex(
      (command) =>
        command.startsWith("apply ") &&
        !command.includes("--dry-run") &&
        command.includes("08-networkpolicy"),
    );
    const deletion = commands.findIndex((command) =>
      command.startsWith("delete job/"),
    );
    const creation = commands.findIndex((command) =>
      command.startsWith("create -f"),
    );
    const wait = commands.findIndex((command) => command.startsWith("wait "));
    const deployment = commands.findIndex(
      (command) =>
        command.startsWith("apply ") &&
        !command.includes("--dry-run") &&
        command.includes("03-backend"),
    );
    const rollout = commands.findIndex((command) =>
      command.startsWith("rollout "),
    );
    assert.ok(
      policy >= 0 &&
        policy < deletion &&
        deletion < creation &&
        creation < wait &&
        wait < deployment &&
        deployment < rollout,
    );
    assert.match(commands[deletion], /--ignore-not-found --wait=true/);
    assert.equal(
      commands.some((command) => command.includes("02-secret.example.yaml")),
      false,
    );
  }
});
