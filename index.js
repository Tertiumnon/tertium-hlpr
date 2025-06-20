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
  return new Promise((resolve2) => {
    rl.question(question, (answer) => {
      resolve2(answer);
    });
  });
}
async function executeCommand(command, variables) {
  let processedCommand = command;
  for (const [key, value] of Object.entries(variables)) {
    processedCommand = processedCommand.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return new Promise((resolve2) => {
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
        resolve2(true);
      } else {
        console.error(`Command failed with exit code ${code}`);
        resolve2(false);
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
  if (commandArgs.length === 0) {
    console.error("Please provide a command. Example: hlpr ssh init-dir");
    process.exit(1);
  }
  try {
    const category = commandArgs[0];
    const restArgs = commandArgs.slice(1);
    const scriptName = restArgs.join("");
    const __filename2 = fileURLToPath(import.meta.url);
    const __dirname2 = path.dirname(__filename2);
    const scriptDir = path.resolve(__dirname2, "..");
    const scriptPath = path.join(scriptDir, "commands", category, `${scriptName}.sh`);
    if (!fs.existsSync(scriptPath)) {
      console.error(`Script not found: ${scriptPath}`);
      process.exit(1);
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
