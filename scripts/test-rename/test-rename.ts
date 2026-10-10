#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TMP_DIR,
  TEST_COMMAND,
  TEST_CASE,
  DRY_RUN_FLAG,
  EXPECTED_FILES,
  MESSAGES,
} from "./test-rename.constants.js";

function log(...args: unknown[]): void {
  console.log(...args);
}

function resetDir(): void {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

function createTestFiles(): void {
  const nestedDir = path.join(TMP_DIR, "Nested Dir");
  const deepDir = path.join(nestedDir, "Deep Directory");
  fs.mkdirSync(deepDir, { recursive: true });
  fs.writeFileSync(path.join(TMP_DIR, "File One.txt"), "x");
  fs.writeFileSync(path.join(TMP_DIR, "another-file.TXT"), "y");
  fs.writeFileSync(path.join(nestedDir, "Deep File.testdata.js"), "z");
  fs.writeFileSync(path.join(deepDir, "Inner File.md"), "a");
}

function exists(p: string): boolean {
  return fs.existsSync(p);
}

async function main(): Promise<void> {
  log(MESSAGES.cleaning);
  resetDir();
  log(MESSAGES.creating);
  createTestFiles();

  log(MESSAGES.building);
  const build = spawnSync("bun", ["run", "build"], { stdio: "inherit" });
  if (build.status !== 0) {
    log(MESSAGES.buildFailed);
    process.exit(build.status || 1);
  }

  log(MESSAGES.dryRun);
  const dry = spawnSync("node", ["bin/index.js", ...TEST_COMMAND, TMP_DIR, TEST_CASE, DRY_RUN_FLAG], {
    encoding: "utf8",
  });
  log(dry.stdout);
  if (!dry.stdout?.includes("Dry run - would rename")) {
    log(MESSAGES.dryRunNotReported);
    process.exit(1);
  }

  if (!exists(path.join(TMP_DIR, "File One.txt")) || !exists(path.join(TMP_DIR, "Nested Dir", "Deep File.testdata.js"))) {
    log(MESSAGES.filesChanged);
    process.exit(1);
  }

  log(MESSAGES.actualRun);
  const actual = spawnSync("node", ["bin/index.js", ...TEST_COMMAND, TMP_DIR, TEST_CASE], {
    encoding: "utf8",
  });
  log(actual.stdout);
  if (!actual.stdout?.includes("Renamed")) {
    log(MESSAGES.renameNotReported);
    process.exit(1);
  }

  for (const file of EXPECTED_FILES) {
    const p = path.join(TMP_DIR, file);
    if (!exists(p)) {
      log(MESSAGES.expectedNotFound, p);
      process.exit(1);
    }
  }

  log(MESSAGES.success);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
