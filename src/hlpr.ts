import { readFile } from "node:fs/promises";
import { exec } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as readline from "node:readline";

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

async function main() {
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
    const scriptPath = path.join(process.cwd(), "commands", category, `${scriptName}.sh`);
    
    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`Script not found: ${scriptPath}`);
      process.exit(1);
    }

    // Read the script content
    const scriptContent = await readFile(scriptPath, "utf-8");
    const lines = scriptContent.split("\n");
    
    // Extract variables from the script (anything in {{variable}})
    const variableRegex = /{{([^}]+)}}/g;
    const variables: Record<string, string> = {};
    const uniqueVars = new Set<string>();
    
    lines.forEach(line => {
      let match;
      while ((match = variableRegex.exec(line)) !== null) {
        uniqueVars.add(match[1]);
      }
    });
    
    // Prompt for each variable
    for (const varName of uniqueVars) {
      const value = await prompt(`Enter ${varName}: `);
      variables[varName] = value;
    }
    
    // Execute each line of the script
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const success = await executeCommand(line, variables);
      
      // If command failed and force flag is not set, exit
      if (!success && !forceFlag) {
        console.error("Command failed, stopping execution.");
        process.exit(1);
      }
    }
    
    console.log("Command completed successfully!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();