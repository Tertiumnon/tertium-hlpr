import path from "node:path";

export const TMP_DIR = path.join(process.cwd(), "tmp", "rename-e2e");
export const TEST_COMMAND = ["file", "rename"];
export const TEST_CASE = "kebab";
export const DRY_RUN_FLAG = "--dry";

export const EXPECTED_FILES = [
  "file-one.txt",
  "nested-dir",
  "nested-dir/deep-file.testdata.js",
  "nested-dir/deep-directory/inner-file.md",
];

export const MESSAGES = {
  cleaning: "Cleaning tmp dir...",
  creating: "Creating test structure...",
  building: "Building project (bun run build)...",
  buildFailed: "Build failed",
  dryRun: "Running dry-run rename...",
  dryRunNotReported: "Dry run did not report rename",
  filesChanged: "Files changed during dry run",
  actualRun: "Running actual rename...",
  renameNotReported: "Rename command did not report changes",
  expectedNotFound: "Expected file not found:",
  success: "E2E rename test passed successfully",
} as const;
