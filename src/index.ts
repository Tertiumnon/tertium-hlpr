import { readFile } from "node:fs/promises";
import { exec } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as readline from "node:readline";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

// Get package version from package.json
async function getVersion(): Promise<string> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packagePath = path.join(path.dirname(__dirname), 'package.json');
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
  
  // Check for help flag or no arguments
  if (commandArgs.length === 0 || commandArgs[0] === "help" || commandArgs[0] === "--help" || commandArgs[0] === "-h" || commandArgs[0] === "/help" || commandArgs[0] === "/h" || commandArgs[0] === "/?") {
    // Run help command
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const helpScriptPath = path.join(__dirname, "commands", "help", "help.ts");
    
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
    // Get the category (first argument) and the rest of the command
    const category = commandArgs[0];
    const restArgs = commandArgs.slice(1);
    
    // Get the directory where the hlpr script is installed
    // Use import.meta.url to get the correct path in ESM
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Since index.js is in the project root, scriptDir is __dirname
    const scriptDir = __dirname;
    
    // Check for TypeScript command first
    let scriptPath: string;
    let isTypeScriptCommand = false;
    
    // Try nested structure: commands/<category>/<subcategory>/<subcategory>.ts
    // e.g., "hlpr file rename" -> commands/file/rename/rename.ts
    if (restArgs.length > 0) {
      const subcategory = restArgs[0];
      const nestedTsPath = path.join(scriptDir, "commands", category, subcategory, `${subcategory}.ts`);
      if (fs.existsSync(nestedTsPath)) {
        scriptPath = nestedTsPath;
        isTypeScriptCommand = true;
      }
    }
    
    // Try flat structure: commands/<category>/<category>.ts
    // e.g., "hlpr rename" -> commands/rename/rename.ts
    if (!isTypeScriptCommand) {
      const tsPath = path.join(scriptDir, "commands", category, `${category}.ts`);
      if (fs.existsSync(tsPath)) {
        scriptPath = tsPath;
        isTypeScriptCommand = true;
      }
    }
    
    // Try shell script: commands/<category>/<scriptname>.sh
    if (!isTypeScriptCommand && restArgs.length > 0) {
      // Join the rest of the arguments without hyphens for shell script name
      const scriptName = restArgs.join("");
      scriptPath = path.join(scriptDir, "commands", category, `${scriptName}.sh`);
      
      // Check if the script exists
      if (!fs.existsSync(scriptPath)) {
        console.error(`Script not found: ${scriptPath}`);
        process.exit(1);
      }
    }
    
    if (!scriptPath!) {
      console.error(`Command not found. Usage: hlpr ${category} <args>`);
      process.exit(1);
    }

    // Handle TypeScript commands differently
    if (isTypeScriptCommand) {
      // For TypeScript commands, pass all args after category to the command
      // For nested commands (file rename), skip category and subcategory
      const tsArgs = restArgs.length > 0 && restArgs[0] && fs.existsSync(path.join(scriptDir, "commands", category, restArgs[0]))
        ? process.argv.slice(4) // Skip node, script, category, and subcategory
        : process.argv.slice(3); // Skip node, script, and category
      
      // Use bun to run TypeScript files directly
      const finalCommand = `bun "${scriptPath}" ${tsArgs.join(' ')}`;
      
      console.log(`Executing TypeScript command: ${finalCommand}`);
      
      const success = await executeCommand(finalCommand, {});
      
      if (!success && !forceFlag) {
        console.error("Command failed, stopping execution.");
        process.exit(1);
      }
      
      console.log("Command completed successfully!");
      rl.close();
      return;
    }

    // Read the script content for shell scripts
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
if (import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  main();
}