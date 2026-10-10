import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
