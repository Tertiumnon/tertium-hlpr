#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

/**
 * Build script to copy command files from src/commands to bin/commands
 */

function buildCommands(srcDir) {
  const items = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(srcDir, item.name);

    if (item.isDirectory()) {
      buildCommands(fullPath);
    } else if (item.name.endsWith(".sh") || item.name.endsWith(".cjs")) {
      // Copy shell scripts and CommonJS files
      const relativePath = path.relative("src", fullPath);
      const outPath = path.join("bin", relativePath);
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      console.log(`Copying ${fullPath} -> ${outPath}`);
      fs.copyFileSync(fullPath, outPath);
    } else if (item.name.endsWith(".js")) {
      // Copy .js files (e.g., deploy.js wrapper)
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

buildCommands("src/commands");
