#!/usr/bin/env node

// src/index.ts
import { readFile } from "node:fs/promises";
import { exec } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";
async function getVersion() {
  try {
    const __filename2 = fileURLToPath(import.meta.url);
    const __dirname2 = path.dirname(__filename2);
    const packagePath = path.join(path.dirname(__dirname2), "package.json");
    const packageJson = JSON.parse(await readFile(packagePath, "utf-8"));
    return packageJson.version;
  } catch (error) {
    console.error("Error reading package.json:", error);
    return "0.0.0";
  }
}
var __filename2 = fileURLToPath(import.meta.url);
var __dirname2 = path.dirname(__filename2);
var scriptDir = path.join(__dirname2, "..", "src");
var args = process.argv.slice(2);
var forceFlag = false;
var commandArgs = [];
if (args[0] === "-f") {
  forceFlag = true;
  commandArgs = args.slice(1);
} else {
  commandArgs = args;
}
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}
async function executeCommand(command, variables) {
  let processedCommand = command;
  for (const [key, value] of Object.entries(variables)) {
    processedCommand = processedCommand.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return new Promise((resolve) => {
    console.log(`Executing: ${processedCommand}`);
    const childProcess = exec(processedCommand);
    if (childProcess.stdout) {
      childProcess.stdout.on("data", (data) => {
        console.log(data.toString().trim());
      });
    }
    if (childProcess.stderr) {
      childProcess.stderr.on("data", (data) => {
        console.error(data.toString().trim());
      });
    }
    childProcess.on("exit", (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        console.error(`Command failed with exit code ${code}`);
        resolve(false);
      }
    });
  });
}
async function showHelp() {
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
    } catch (error) {}
    return commands;
  }
  const version = await getVersion();
  const binCommandsDir = path.join(__dirname2, "commands");
  const srcCommandsDir = path.join(__dirname2, "..", "src", "commands");
  const commands = [
    ...await discoverCommands(binCommandsDir),
    ...await discoverCommands(srcCommandsDir)
  ];
  const uniqueCommands = commands.filter((cmd, index, self) => index === self.findIndex((c) => c.category === cmd.category && c.name === cmd.name));
  console.log(`
╔════════════════════════════════════════════════════════════╗`);
  console.log(`║              hlpr - Helper CLI Tool v${version.padEnd(16)}║`);
  console.log(`╚════════════════════════════════════════════════════════════╝
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
  const grouped = uniqueCommands.reduce((acc, cmd) => {
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
  if (commandArgs[0] === "--version" || commandArgs[0] === "-v") {
    const version = await getVersion();
    console.log(`hlpr version ${version}`);
    process.exit(0);
  }
  if (commandArgs.length === 0 || commandArgs[0] === "help" || commandArgs[0] === "--help" || commandArgs[0] === "-h" || commandArgs[0] === "/help" || commandArgs[0] === "/h" || commandArgs[0] === "/?") {
    await showHelp();
    process.exit(0);
  }
  try {
    const category = commandArgs[0];
    const restArgs = commandArgs.slice(1);
    let scriptPath;
    let isTypeScriptCommand = false;
    if (restArgs.length > 0) {
      const subcategory = restArgs[0];
      const nestedJsPath = path.join(__dirname2, "..", "bin", "commands", category, subcategory, `${subcategory}.js`);
      if (fs.existsSync(nestedJsPath)) {
        scriptPath = nestedJsPath;
        isTypeScriptCommand = true;
      }
    }
    if (!isTypeScriptCommand) {
      const jsPath = path.join(__dirname2, "..", "bin", "commands", category, `${category}.js`);
      if (fs.existsSync(jsPath)) {
        scriptPath = jsPath;
        isTypeScriptCommand = true;
      }
    }
    if (!isTypeScriptCommand && restArgs.length > 0) {
      const scriptName = restArgs[0];
      let scriptPathCandidate = path.join(scriptDir, "commands", category, `${scriptName}.sh`);
      if (!fs.existsSync(scriptPathCandidate)) {
        scriptPathCandidate = path.join(__dirname2, "..", "bin", "commands", category, `${scriptName}.sh`);
      }
      if (fs.existsSync(scriptPathCandidate)) {
        scriptPath = scriptPathCandidate;
      } else {
        console.error(`Script not found: ${scriptPathCandidate}`);
        process.exit(1);
      }
    }
    if (!scriptPath) {
      console.error(`Command not found. Usage: hlpr ${category} <args>`);
      process.exit(1);
    }
    if (isTypeScriptCommand) {
      let tsArgs;
      if (restArgs.length > 0 && restArgs[0] && scriptPath) {
        const subcategory = restArgs[0];
        const isNested = path.basename(scriptPath) === `${subcategory}.js` && path.basename(path.dirname(scriptPath)) === subcategory;
        tsArgs = isNested ? process.argv.slice(4) : process.argv.slice(3);
      } else {
        tsArgs = process.argv.slice(3);
      }
      const finalCommand = `node "${scriptPath}" ${tsArgs.join(" ")}`;
      console.log(`Executing command: ${finalCommand}`);
      const success = await executeCommand(finalCommand, {});
      const helpFlags = ["-h", "--help", "help", "/h", "/help", "/?"];
      const isHelpInvocation = tsArgs.some((arg) => helpFlags.includes(arg));
      if (!success && !forceFlag && !isHelpInvocation) {
        console.error("Command failed, stopping execution.");
        process.exit(1);
      }
      console.log("Command completed successfully!");
      rl.close();
      return;
    }
    const scriptContent = await readFile(scriptPath, "utf-8");
    const scriptArgs = restArgs.slice(1);
    const variableRegex = /{{([^}]+)}}/g;
    const variables = {};
    const uniqueVars = new Set;
    let match;
    while ((match = variableRegex.exec(scriptContent)) !== null) {
      uniqueVars.add(match[1]);
    }
    const helpFlags = ["-h", "--help", "help", "/h", "/help", "/?"];
    const isHelpRequested = scriptArgs.some((arg) => helpFlags.includes(arg));
    if (!isHelpRequested) {
      for (const varName of uniqueVars) {
        const value = await prompt(`Enter ${varName}: `);
        variables[varName] = value;
      }
    }
    let processedScript = scriptContent;
    for (const [key, value] of Object.entries(variables)) {
      processedScript = processedScript.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    const tempScriptPath = path.join(path.dirname(scriptPath), `_temp_${path.basename(scriptPath)}`);
    fs.writeFileSync(tempScriptPath, processedScript);
    const argsStr = scriptArgs.map((arg) => `"${arg}"`).join(" ");
    const command = `bash "${tempScriptPath}" ${argsStr}`;
    const success = await executeCommand(command, {});
    fs.unlinkSync(tempScriptPath);
    if (!success && !forceFlag) {
      console.error("Command failed, stopping execution.");
      process.exit(1);
    }
    console.log("Command completed successfully!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
