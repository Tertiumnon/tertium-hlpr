#!/usr/bin/env bun
// @bun

// src/commands/help/help.ts
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
async function getVersion() {
  try {
    const __filename2 = fileURLToPath(import.meta.url);
    const __dirname2 = path.dirname(__filename2);
    const packagePath = path.join(__dirname2, "..", "..", "package.json");
    const packageJson = JSON.parse(await readFile(packagePath, "utf-8"));
    return packageJson.version;
  } catch (error) {
    return "0.0.0";
  }
}
async function getCommandDescription(filePath) {
  try {
    const content = await readFile(filePath, "utf-8");
    const descMatch = content.match(/(?:\/\/|#)\s*@description\s+(.+)/);
    if (descMatch) {
      return descMatch[1].trim();
    }
    const dir = path.dirname(filePath);
    const readmePath = path.join(dir, "README.md");
    if (fs.existsSync(readmePath)) {
      const readme = await readFile(readmePath, "utf-8");
      const firstLine = readme.split(`
`).find((line) => line.trim() && !line.startsWith("#"));
      if (firstLine) {
        return firstLine.trim();
      }
    }
  } catch (error) {}
  return;
}
async function discoverCommands(commandsDir) {
  const commands = [];
  try {
    const categories = await fs.promises.readdir(commandsDir, { withFileTypes: true });
    for (const category of categories) {
      if (!category.isDirectory())
        continue;
      const categoryPath = path.join(commandsDir, category.name);
      const items = await fs.promises.readdir(categoryPath, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          const nestedJsPath = path.join(categoryPath, item.name, `${item.name}.js`);
          const nestedShPath = path.join(categoryPath, item.name, `${item.name}.sh`);
          let commandPath;
          let commandType;
          if (fs.existsSync(nestedJsPath)) {
            commandPath = nestedJsPath;
            commandType = "typescript";
          } else if (fs.existsSync(nestedShPath)) {
            commandPath = nestedShPath;
            commandType = "shell";
          } else {
            continue;
          }
          const description = await getCommandDescription(commandPath);
          commands.push({
            category: category.name,
            name: item.name,
            type: commandType,
            path: commandPath,
            description
          });
        } else if (item.name.endsWith(".js")) {
          const jsPath = path.join(categoryPath, item.name);
          const commandName = path.basename(item.name, ".js");
          if (commandName !== "test" && !commandName.endsWith(".test")) {
            const description = await getCommandDescription(jsPath);
            commands.push({
              category: category.name,
              name: commandName,
              type: "typescript",
              path: jsPath,
              description
            });
          }
        } else if (item.name.endsWith(".sh")) {
          const shPath = path.join(categoryPath, item.name);
          const commandName = path.basename(item.name, ".sh");
          const description = await getCommandDescription(shPath);
          commands.push({
            category: category.name,
            name: commandName,
            type: "shell",
            path: shPath,
            description
          });
        }
      }
    }
  } catch (error) {
    console.error("Error discovering commands:", error);
  }
  return commands;
}
function printHelp(commands, version) {
  console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557`);
  console.log(`\u2551              hlpr - Helper CLI Tool v${version.padEnd(16)}\u2551`);
  console.log(`\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`);
  console.log("USAGE:");
  console.log(`  hlpr [options] <category> <command> [args...]
`);
  console.log("OPTIONS:");
  console.log("  -f              Force execution (continue on errors)");
  console.log("  -v, --version   Show version information");
  console.log("  help, -h, --help, /h, /help, /?");
  console.log(`                  Show this help message
`);
  console.log(`AVAILABLE COMMANDS:
`);
  const grouped = commands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {});
  const sortedCategories = Object.keys(grouped).sort();
  for (const category of sortedCategories) {
    console.log(`  ${category}:`);
    const categoryCommands = grouped[category].sort((a, b) => a.name.localeCompare(b.name));
    for (const cmd of categoryCommands) {
      const typeLabel = cmd.type === "typescript" ? "(TS)" : "(sh)";
      const cmdDisplay = cmd.category === cmd.name ? `hlpr ${cmd.name}`.padEnd(35) : `hlpr ${cmd.category} ${cmd.name}`.padEnd(35);
      if (cmd.description) {
        console.log(`    ${cmdDisplay} ${typeLabel.padEnd(6)} ${cmd.description}`);
      } else {
        console.log(`    ${cmdDisplay} ${typeLabel}`);
      }
    }
    console.log("");
  }
  console.log("EXAMPLES:");
  console.log("  hlpr help");
  console.log("  hlpr file rename --style kebab --dir ./src");
  console.log("  hlpr ssh init-dir");
  console.log(`  hlpr -f git precommit
`);
}
async function main() {
  try {
    const __filename2 = fileURLToPath(import.meta.url);
    const __dirname2 = path.dirname(__filename2);
    const binCommandsDir = path.join(__dirname2, "..");
    const srcCommandsDir = path.join(__dirname2, "..", "..", "..", "src", "commands");
    const version = await getVersion();
    const commands = [
      ...await discoverCommands(binCommandsDir),
      ...await discoverCommands(srcCommandsDir)
    ];
    const uniqueCommands = commands.filter((cmd, index, self) => index === self.findIndex((c) => c.category === cmd.category && c.name === cmd.name));
    printHelp(uniqueCommands, version);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}
main();
