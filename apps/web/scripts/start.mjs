import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
const root = path.resolve(import.meta.dirname, "..");
const standalone = path.join(root, ".next", "standalone");
if (!fs.existsSync(path.join(standalone, "server.js")))
  throw Error("Run npm run build before npm start");
fs.cpSync(path.join(root, "public"), path.join(standalone, "public"), {
  recursive: true,
});
fs.cpSync(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
  { recursive: true },
);
const child = spawn(process.execPath, [path.join(standalone, "server.js")], {
  cwd: standalone,
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: process.env.PORT || "3001",
    HOSTNAME: process.env.HOSTNAME || "127.0.0.1",
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => (process.exitCode = code || 0));
