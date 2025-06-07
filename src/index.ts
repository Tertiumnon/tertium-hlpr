import { readFile } from "node:fs/promises";
import { exec } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as readline from "node:readline";
import * as os from "node:os";

// Get package version from package.json
async function getVersion(): Promise<string> {
  try {
    const packagePath = path.join(path.dirname(path.dirname(__dirname)), 'package.json');
    const packageJson = JSON.parse(await readFile(packagePath, 'utf-8'));
    return packageJson.version;
  } catch (error) {
    console.error('Error reading package.json:', error);
    return '0.0.0'; // Fallback version
  }
}

// Detect shell type
function detectShell(): string {
  const isWindows = os.platform() === "win32";
  if (isWindows) {
    return "powershell";
  }
  return "bash"; // Default to bash for Unix-like systems
}

// Parse command line arguments
const args = process.argv.slice(2);
let forceFlag = false;
let commandArgs: string[] = [];

// Check for -f flag
if (args[0] === "-f") {
  forceFlag = true;
  commandArgs = args.slice(1);
} else {
  commandArgs = args;
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for user input
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Execute a command with variable substitution
async function executeCommand(command: string, variables: Record<string, string>): Promise<boolean> {
  // Replace variables in the command
  let processedCommand = command;
  for (const [key, value] of Object.entries(variables)) {
    processedCommand = processedCommand.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return new Promise((resolve) => {
    console.log(`Executing: ${processedCommand}`);
    const childProcess = exec(processedCommand);
    
    if (childProcess.stdout) {
      childProcess.stdout.on("data", (data: string) => {
        console.log(data.toString().trim());
      });
    }
    
    if (childProcess.stderr) {
      childProcess.stderr.on("data", (data: string) => {
        console.error(data.toString().trim());
      });
    }
    
    childProcess.on("exit", (code: number | null) => {
      if (code === 0) {
        resolve(true);
      } else {
        console.error(`Command failed with exit code ${code}`);
        resolve(false);
      }
    });
  });
}

export async function main() {
  // Check for version flag
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
    // Get the category (first argument) and the rest of the command
    const category = commandArgs[0];
    const restArgs = commandArgs.slice(1);
    
    // Join the rest of the arguments without hyphens
    const scriptName = restArgs.join("");
    
    // Get the directory where the hlpr script is installed
    const scriptDir = path.dirname(path.dirname(__dirname));
    const scriptPath = path.join(scriptDir, "commands", category, `${scriptName}.sh`);
    
    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`Script not found: ${scriptPath}`);
      process.exit(1);
    }

    // Read the script content
    const scriptContent = await readFile(scriptPath, "utf-8");
    
    // Extract variables from the script (anything in {{variable}})
    const variableRegex = /{{([^}]+)}}/g;
    const variables: Record<string, string> = {};
    const uniqueVars = new Set<string>();
    
    let match;
    while ((match = variableRegex.exec(scriptContent)) !== null) {
      uniqueVars.add(match[1]);
    }
    
    // Prompt for each variable
    for (const varName of uniqueVars) {
      const value = await prompt(`Enter ${varName}: `);
      variables[varName] = value;
    }
    
    // Create a temporary script with variables substituted
    let processedScript = scriptContent;
    for (const [key, value] of Object.entries(variables)) {
      processedScript = processedScript.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    const tempScriptPath = path.join(path.dirname(scriptPath), `_temp_${path.basename(scriptPath)}`);
    fs.writeFileSync(tempScriptPath, processedScript);
    
    // Execute the temporary script with appropriate shell
    const shell = detectShell();
    const command = shell === "powershell" 
      ? `powershell -File "${tempScriptPath}"` 
      : `bash "${tempScriptPath}"`;
    const success = await executeCommand(command, {});
    
    // Clean up the temporary script
    fs.unlinkSync(tempScriptPath);
    
    // If command failed and force flag is not set, exit
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

// If this file is run directly, execute main
if (require.main === module) {
  main();
}