// @bun
// src/commands/update/update.ts
import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
var PACKAGE_NAME = "@tertium/hlpr";
function isNewer(latest, current) {
  const a = latest.split(".").map(Number);
  const b = current.split(".").map(Number);
  for (let i = 0;i < 3; i++) {
    if (a[i] !== b[i])
      return a[i] > b[i];
  }
  return false;
}
var __dirname2 = path.dirname(fileURLToPath(import.meta.url));
var packagePath = path.join(__dirname2, "..", "..", "..", "package.json");
var currentVersion = JSON.parse(readFileSync(packagePath, "utf-8")).version;
var latestVersion = execSync(`npm view ${PACKAGE_NAME} version`, { encoding: "utf-8" }).trim();
if (isNewer(latestVersion, currentVersion)) {
  console.log(`Updating hlpr v${currentVersion} -> v${latestVersion}`);
  execSync(`npm install -g ${PACKAGE_NAME}@latest`, { stdio: "inherit" });
  console.log(`\u2713 hlpr updated to v${latestVersion}`);
} else {
  console.log(`hlpr is up to date (v${currentVersion}, npm latest v${latestVersion})`);
}
