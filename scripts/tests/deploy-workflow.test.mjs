import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parse } from "yaml";

const workflow = parse(
  readFileSync(
    new URL("../../.github/workflows/deploy-production.yml", import.meta.url),
    "utf8",
  ),
);
const headCheck = workflow.jobs.deploy.steps.find(
  ({ id }) => id === "release",
).run;
const bash =
  process.env.BASH_PATH ||
  (process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash");

test("only the current scanned commit is eligible for deployment", (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "genyxo-release-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const output = join(cwd, "output");
  for (const [remoteStatus, remoteSha, expectedStatus, shouldDeploy] of [
    ["0", "scanned", 0, true],
    ["0", "newer", 0, false],
    ["2", "", 2, false],
  ]) {
    writeFileSync(output, "");
    const result = spawnSync(
      bash,
      [
        "--noprofile",
        "--norc",
        "-eo",
        "pipefail",
        "-c",
        [
          'git() { [[ "$*" == "ls-remote --exit-code origin refs/heads/master" ]] || return 3; printf "%s\\trefs/heads/master\\n" "$REMOTE_SHA"; return "$REMOTE_STATUS"; }',
          headCheck,
        ].join("\n"),
      ],
      {
        cwd,
        encoding: "utf8",
        env: {
          ...process.env,
          RELEASE_SHA: "scanned",
          RELEASE_BRANCH: "master",
          REMOTE_SHA: remoteSha,
          REMOTE_STATUS: remoteStatus,
          GITHUB_OUTPUT: "output",
        },
      },
    );
    assert.equal(result.status, expectedStatus, result.stderr);
    assert.equal(
      readFileSync(output, "utf8").includes("current=true"),
      shouldDeploy,
    );
  }
});
