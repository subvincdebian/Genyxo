import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";

const source = new URL("../apps/backend/dist/openapi.json", import.meta.url);
const targetDirectory = new URL("../apps/web/types/", import.meta.url);

mkdirSync(targetDirectory, { recursive: true });
const schema = await format(readFileSync(source, "utf8"), { parser: "json" });
writeFileSync(new URL("openapi.json", targetDirectory), schema);
