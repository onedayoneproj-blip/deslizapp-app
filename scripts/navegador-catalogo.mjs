import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { join } from "node:path";
const require = createRequire(import.meta.url);
let p;
try {
  p = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
} catch {
  p = require(join(execSync("npm root -g").toString().trim(), "playwright"));
}
export const playwright = p;
export const URL = (process.env.URL ?? "http://localhost:3220").replace(
  /\/$/,
  "",
);
export async function navegador() {
  return p.chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
}
