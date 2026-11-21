import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Compose now requires every env_file to exist even with --no-env-resolution.
// A clean checkout (CI) has none, so stand in the public example for the
// duration of the check and remove it afterwards; a real .env is never touched.
const envFile = fileURLToPath(new URL("../apps/backend/.env", import.meta.url));
const standIn = !existsSync(envFile);
if (standIn)
  copyFileSync(new URL("../apps/backend/.env.example", import.meta.url), envFile);
process.on("exit", () => {
  if (standIn) rmSync(envFile, { force: true });
});

const configurations = [
  ["docker-compose.yml"],
  ["docker-compose.dev.yml"],
  ["docker-compose.yml", "docker-compose.prod.yml"],
];
for (const files of configurations) {
  const result = spawnSync(
    "docker",
    [
      "compose",
      "--env-file",
      "apps/backend/.env.example",
      ...files.flatMap((file) => ["-f", file]),
      "config",
      "--no-env-resolution",
      "--quiet",
    ],
    { cwd: fileURLToPath(new URL("../", import.meta.url)), encoding: "utf8" },
  );
  if (result.error || result.status !== 0) {
    console.error(`Compose validation failed: ${files.join(" + ")}`);
    // Quiet validation uses public example values; never resolve runtime env_file secrets.
    console.error(result.error?.message ?? result.stderr);
    process.exitCode = 1;
  } else console.log(`Compose configuration valid: ${files.join(" + ")}`);
}
