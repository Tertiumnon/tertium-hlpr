#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { COPYABLE_EXTENSIONS, COMPILABLE_EXTENSIONS, SRC_COMMANDS_DIR, BIN_OUTPUT_DIR } from "./build-commands.constants.js";

function buildCommands(srcDir: string): void {
  const items = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(srcDir, item.name);

    if (item.isDirectory()) {
      buildCommands(fullPath);
    } else if (item.name.endsWith(".md") || COPYABLE_EXTENSIONS.some((ext) => item.name.endsWith(ext))) {
      const relativePath = path.relative("src", fullPath);
      const outPath = path.join(BIN_OUTPUT_DIR, relativePath);
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      console.log(`Copying ${fullPath} -> ${outPath}`);
      fs.copyFileSync(fullPath, outPath);
    } else if (COMPILABLE_EXTENSIONS.some((ext) => item.name.endsWith(ext)) && !item.name.includes(".test.") && !item.name.includes(".e2e.")) {
      const relativePath = path.relative("src", fullPath);
      const outPath = path.join(BIN_OUTPUT_DIR, relativePath.replace(/\.ts$/, ".js"));
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      console.log(`Compiling ${fullPath} -> ${outPath}`);
      try {
        execSync(`bun build "${fullPath}" --outfile "${outPath}" --target bun`, { stdio: "inherit" });
      } catch (error) {
        console.error(`Failed to compile ${fullPath}:`, error);
        process.exit(1);
      }
      // Bun strips comments, so keep @description for help discovery.
      const description = fs.readFileSync(fullPath, "utf8").match(/(?:\/\/|#)\s*@description\s+(.+)/);
      if (description) {
        const compiled = fs.readFileSync(outPath, "utf8");
        const insertAt = compiled.startsWith("#!") ? compiled.indexOf("\n") + 1 : 0;
        fs.writeFileSync(outPath, `${compiled.slice(0, insertAt)}// @description ${description[1].trim()}\n${compiled.slice(insertAt)}`);
      }
    }
  }
}

// Remove generated commands so renamed or deleted commands cannot remain in help.
const commandsOutput = path.resolve(BIN_OUTPUT_DIR, 'commands');
if (commandsOutput !== path.resolve('bin/commands')) throw new Error('Unexpected command output directory');
fs.rmSync(commandsOutput, { recursive: true, force: true });
buildCommands(SRC_COMMANDS_DIR);
