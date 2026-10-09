import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { checkLocalPath, checkPackageLock } from "../check-repository.mjs";

test("local paths reject missing files, incorrect Linux case and owner escapes", (t) => {
  const base = mkdtempSync(path.join(tmpdir(), "genyxo-paths-"));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  mkdirSync(path.join(base, "apps"));
  writeFileSync(path.join(base, "apps", "Dockerfile"), "FROM scratch\n");
  assert.equal(checkLocalPath(base, "./apps/Dockerfile"), path.join(base, "apps", "Dockerfile"));
  assert.throws(() => checkLocalPath(base, "apps/dockerfile"), /incorrect letter case/);
  assert.throws(() => checkLocalPath(base, "apps/missing"), /Missing path/);
  assert.throws(() => checkLocalPath(base, "../outside"), /escapes its owner/);
});

test("dependency ranges and package identity must match the committed lockfile", () => {
  const manifest = { name: "fixture", version: "1.0.0", dependencies: { library: "^1.2.0" } };
  const lock = { packages: { "": { ...manifest, dependencies: { library: "^1.2.0" } } } };
  assert.doesNotThrow(() => checkPackageLock(manifest, lock, "fixture"));
  assert.throws(() => checkPackageLock({ ...manifest, name: "other" }, lock, "fixture"), /identity/);
  assert.throws(() => checkPackageLock({ ...manifest, dependencies: { library: "^2.0.0" } }, lock, "fixture"), /dependencies/);
  assert.throws(() => checkPackageLock({ ...manifest, devDependencies: { tool: "1.0.0" } }, lock, "fixture"), /devDependencies/);
});
