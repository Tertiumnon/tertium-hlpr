// src/index.ts
import { readFile } from "node:fs/promises";
import { exec } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as readline from "node:readline";
import * as os from "node:os";
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
function detectShell() {
  const isWindows = os.platform() === "win32";
  if (isWindows) {
    return "powershell";
  }
  return "bash";
}
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
async function main() {
  if (commandArgs[0] === "--version" || commandArgs[0] === "-v") {
    const version = await getVersion();
    console.log(`hlpr version ${version}`);
    process.exit(0);
  }
  if (commandArgs.length === 0 || commandArgs[0] === "help" || commandArgs[0] === "--help" || commandArgs[0] === "-h" || commandArgs[0] === "/help" || commandArgs[0] === "/h" || commandArgs[0] === "/?") {
    const __filename2 = fileURLToPath(import.meta.url);
    const __dirname2 = path.dirname(__filename2);
    const helpScriptPath = path.join(__dirname2, "commands", "help", "help.ts");
    if (fs.existsSync(helpScriptPath)) {
      const helpCommand = `bun "${helpScriptPath}"`;
      await executeCommand(helpCommand, {});
      rl.close();
      process.exit(0);
    } else {
      console.error("Please provide a command. Example: hlpr ssh init-dir");
      console.error("Run 'hlpr help' for available commands.");
      process.exit(1);
    }
  }
  try {
    const category = commandArgs[0];
    const restArgs = commandArgs.slice(1);
    const __filename2 = fileURLToPath(import.meta.url);
    const __dirname2 = path.dirname(__filename2);
    const scriptDir = __dirname2;
    let scriptPath;
    let isTypeScriptCommand = false;
    if (restArgs.length > 0) {
      const subcategory = restArgs[0];
      const nestedTsPath = path.join(scriptDir, "commands", category, subcategory, `${subcategory}.ts`);
      if (fs.existsSync(nestedTsPath)) {
        scriptPath = nestedTsPath;
        isTypeScriptCommand = true;
      }
    }
    if (!isTypeScriptCommand) {
      const tsPath = path.join(scriptDir, "commands", category, `${category}.ts`);
      if (fs.existsSync(tsPath)) {
        scriptPath = tsPath;
        isTypeScriptCommand = true;
      }
    }
    if (!isTypeScriptCommand && restArgs.length > 0) {
      const scriptName = restArgs.join("");
      scriptPath = path.join(scriptDir, "commands", category, `${scriptName}.sh`);
      if (!fs.existsSync(scriptPath)) {
        console.error(`Script not found: ${scriptPath}`);
        process.exit(1);
      }
    }
    if (!scriptPath) {
      console.error(`Command not found. Usage: hlpr ${category} <args>`);
      process.exit(1);
    }
    if (isTypeScriptCommand) {
      const tsArgs = restArgs.length > 0 && restArgs[0] && fs.existsSync(path.join(scriptDir, "commands", category, restArgs[0])) ? process.argv.slice(4) : process.argv.slice(3);
      const finalCommand = `bun "${scriptPath}" ${tsArgs.join(" ")}`;
      console.log(`Executing TypeScript command: ${finalCommand}`);
      const success2 = await executeCommand(finalCommand, {});
      if (!success2 && !forceFlag) {
        console.error("Command failed, stopping execution.");
        process.exit(1);
      }
      console.log("Command completed successfully!");
      rl.close();
      return;
    }
    const scriptContent = await readFile(scriptPath, "utf-8");
    const variableRegex = /{{([^}]+)}}/g;
    const variables = {};
    const uniqueVars = new Set;
    let match;
    while ((match = variableRegex.exec(scriptContent)) !== null) {
      uniqueVars.add(match[1]);
    }
    for (const varName of uniqueVars) {
      const value = await prompt(`Enter ${varName}: `);
      variables[varName] = value;
    }
    let processedScript = scriptContent;
    for (const [key, value] of Object.entries(variables)) {
      processedScript = processedScript.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    const tempScriptPath = path.join(path.dirname(scriptPath), `_temp_${path.basename(scriptPath)}`);
    fs.writeFileSync(tempScriptPath, processedScript);
    const shell = detectShell();
    const command = shell === "powershell" ? `powershell -File "${tempScriptPath}"` : `bash "${tempScriptPath}"`;
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
if (import.meta.url.startsWith("file:") && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  main();
}
export {
  main
};
