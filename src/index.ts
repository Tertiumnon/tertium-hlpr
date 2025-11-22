#!/usr/bin/env node
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

// Get the directory where the commands are located
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Commands are in src/, so go to src/
const scriptDir = path.join(__dirname, '..', 'src');

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

// Create readline interface for user input (only for non-help commands)
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

// Show help information
async function showHelp() {
  interface CommandInfo {
    category: string;
    name: string;
    type: 'typescript' | 'shell';
    path: string;
    description?: string;
  }

  async function getCommandDescription(filePath: string): Promise<string | undefined> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const descMatch = content.match(/(?:\/\/|#)\s*@description\s+(.+)/);
      if (descMatch) {
        return descMatch[1].trim();
      }
      
      const dir = path.dirname(filePath);
      const readmePath = path.join(dir, 'README.md');
      if (fs.existsSync(readmePath)) {
        const readme = await readFile(readmePath, 'utf-8');
        const firstLine = readme.split('\n').find(line => line.trim() && !line.startsWith('#'));
        if (firstLine) {
          return firstLine.trim();
        }
      }
    } catch (error) {
      // Ignore errors
    }
    return undefined;
  }

  async function discoverCommands(commandsDir: string): Promise<CommandInfo[]> {
    const commands: CommandInfo[] = [];
    
    try {
      const categories = await fs.promises.readdir(commandsDir, { withFileTypes: true });
      
      for (const category of categories) {
        if (!category.isDirectory()) continue;
        
        const categoryPath = path.join(commandsDir, category.name);
        const items = await fs.promises.readdir(categoryPath, { withFileTypes: true });
        
        for (const item of items) {
          if (item.isDirectory()) {
            const nestedJsPath = path.join(categoryPath, item.name, `${item.name}.js`);
            const nestedShPath = path.join(categoryPath, item.name, `${item.name}.sh`);
            let commandPath: string;
            let commandType: 'typescript' | 'shell';
            
            if (fs.existsSync(nestedJsPath)) {
              commandPath = nestedJsPath;
              commandType = 'typescript';
            } else if (fs.existsSync(nestedShPath)) {
              commandPath = nestedShPath;
              commandType = 'shell';
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
          } else if (item.name.endsWith('.js')) {
            const jsPath = path.join(categoryPath, item.name);
            const commandName = path.basename(item.name, '.js');
            if (commandName !== 'test' && !commandName.endsWith('.test')) {
              const description = await getCommandDescription(jsPath);
              commands.push({
                category: category.name,
                name: commandName,
                type: 'typescript',
                path: jsPath,
                description
              });
            }
          } else if (item.name.endsWith('.sh')) {
            const shPath = path.join(categoryPath, item.name);
            const commandName = path.basename(item.name, '.sh');
            const description = await getCommandDescription(shPath);
            commands.push({
              category: category.name,
              name: commandName,
              type: 'shell',
              path: shPath,
              description
            });
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }
    
    return commands;
  }

  const version = await getVersion();
  const binCommandsDir = path.join(__dirname, "commands");
  const srcCommandsDir = path.join(__dirname, '..', 'src', 'commands');
  
  const commands = [
    ...(await discoverCommands(binCommandsDir)),
    ...(await discoverCommands(srcCommandsDir))
  ];
  
  const uniqueCommands = commands.filter((cmd, index, self) => 
    index === self.findIndex(c => c.category === cmd.category && c.name === cmd.name)
  );
  
  // Print help
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║              hlpr - Helper CLI Tool v${version.padEnd(16)}║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
  
  console.log('USAGE:');
  console.log('  hlpr [options] <category> <command> [args...]\n');
  
  console.log('OPTIONS:');
  console.log('  -f              Force execution (continue on errors)');
  console.log('  -v, --version   Show version information');
  console.log('  help, -h, --help, /h, /help, /?');
  console.log('                  Show this help message\n');
  
  console.log('AVAILABLE COMMANDS:\n');
  
  const grouped = uniqueCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandInfo[]>);
  
  const sortedCategories = Object.keys(grouped).sort();
  
  for (const category of sortedCategories) {
    console.log(`  ${category}:`);
    const categoryCommands = grouped[category].sort((a, b) => a.name.localeCompare(b.name));
    
    for (const cmd of categoryCommands) {
      const typeLabel = cmd.type === 'typescript' ? '(TS)' : '(sh)';
      const cmdDisplay = cmd.category === cmd.name 
        ? `hlpr ${cmd.name}`.padEnd(35)
        : `hlpr ${cmd.category} ${cmd.name}`.padEnd(35);
      
      if (cmd.description) {
        console.log(`    ${cmdDisplay} ${typeLabel.padEnd(6)} ${cmd.description}`);
      } else {
        console.log(`    ${cmdDisplay} ${typeLabel}`);
      }
    }
    console.log('');
  }
  
  console.log('EXAMPLES:');
  console.log('  hlpr help');
  console.log('  hlpr file rename --style kebab --dir ./src');
  console.log('  hlpr ssh init-dir');
  console.log('  hlpr -f git precommit\n');
}

async function main() {
  // Check for version flag
  if (commandArgs[0] === "--version" || commandArgs[0] === "-v") {
    const version = await getVersion();
    console.log(`hlpr version ${version}`);
    process.exit(0);
  }

  // Check for help flag or no arguments
  if (commandArgs.length === 0 || commandArgs[0] === "help" || commandArgs[0] === "--help" || commandArgs[0] === "-h" || commandArgs[0] === "/help" || commandArgs[0] === "/h" || commandArgs[0] === "/?") {
    // Run help inline to avoid subprocess issues
    await showHelp();
    process.exit(0);
  }

  try {
    // Get the category (first argument) and the rest of the command
    const category = commandArgs[0];
    const restArgs = commandArgs.slice(1);
    
    // Check for TypeScript command first (now built as JS)
    let scriptPath: string;
    let isTypeScriptCommand = false;
    
    // Try nested structure: bin/commands/<category>/<subcategory>/<subcategory>.js
    // e.g., "hlpr file rename" -> bin/commands/file/rename/rename.js
    if (restArgs.length > 0) {
      const subcategory = restArgs[0];
      const nestedJsPath = path.join(__dirname, "..", "bin", "commands", category, subcategory, `${subcategory}.js`);
      if (fs.existsSync(nestedJsPath)) {
        scriptPath = nestedJsPath;
        isTypeScriptCommand = true;
      }
    }
    
    // Try flat structure: bin/commands/<category>/<category>.js
    // e.g., "hlpr rename" -> bin/commands/rename/rename.js
    if (!isTypeScriptCommand) {
      const jsPath = path.join(__dirname, "..", "bin", "commands", category, `${category}.js`);
      if (fs.existsSync(jsPath)) {
        scriptPath = jsPath;
        isTypeScriptCommand = true;
      }
    }
    
    // Try shell script: commands/<category>/<scriptname>.sh
    if (!isTypeScriptCommand && restArgs.length > 0) {
      // Join the rest of the arguments without hyphens for shell script name
      const scriptName = restArgs.join("");
      let scriptPathCandidate = path.join(scriptDir, "commands", category, `${scriptName}.sh`);
      
      // If not found in scriptDir (src/), try in bin/ (for built version)
      if (!fs.existsSync(scriptPathCandidate)) {
        scriptPathCandidate = path.join(__dirname, "..", "bin", "commands", category, `${scriptName}.sh`);
      }
      
      if (fs.existsSync(scriptPathCandidate)) {
        scriptPath = scriptPathCandidate;
      } else {
        console.error(`Script not found: ${scriptPathCandidate}`);
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
      // Determine if this is a nested TypeScript command by checking the resolved scriptPath
      let tsArgs: string[];
      if (restArgs.length > 0 && restArgs[0] && scriptPath) {
        const subcategory = restArgs[0];
        const isNested = path.basename(scriptPath) === `${subcategory}.js` && path.basename(path.dirname(scriptPath)) === subcategory;
        tsArgs = isNested ? process.argv.slice(4) : process.argv.slice(3);
      } else {
        tsArgs = process.argv.slice(3);
      }
      
      // Use node to run built JavaScript files
      const finalCommand = `node "${scriptPath}" ${tsArgs.join(' ')}`;
      
      console.log(`Executing command: ${finalCommand}`);
      
      const success = await executeCommand(finalCommand, {});
      
      // If this invocation was only to show help, don't treat non-zero exit as failure
      const helpFlags = ['-h', '--help', 'help', '/h', '/help', '/?'];
      const isHelpInvocation = tsArgs.some(arg => helpFlags.includes(arg));
      
      if (!success && !forceFlag && !isHelpInvocation) {
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

// Execute main when this file is run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});