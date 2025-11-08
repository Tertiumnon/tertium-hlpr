#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function buildTsFiles(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      buildTsFiles(fullPath);
    } else if (item.endsWith(".ts") && !item.endsWith(".test.ts")) {
      const relativePath = path.relative("src", fullPath);
      const outPath = path.join("bin", relativePath.replace(".ts", ".js"));
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      console.log(`Building ${fullPath} -> ${outPath}`);
      execSync(`bun build "${fullPath}" --outfile "${outPath}" --target node`, {
        stdio: "inherit",
      });
    } else if (item.endsWith(".sh")) {
      const relativePath = path.relative("src", fullPath);
      const outPath = path.join("bin", relativePath);
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      console.log(`Copying ${fullPath} -> ${outPath}`);
      fs.copyFileSync(fullPath, outPath);
    }
  }
}

buildTsFiles("src/commands");
