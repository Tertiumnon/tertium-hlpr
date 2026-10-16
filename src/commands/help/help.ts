#!/usr/bin/env bun
// @description Show commands grouped by category, with their syntax and short descriptions
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import type { CommandInfo } from "./help.types.js";
import { commandUsages, renderHelp } from "../../core/command/help.js";

async function getVersion(): Promise<string> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packagePath = path.join(__dirname, '..', '..', '..', 'package.json');
    const packageJson = JSON.parse(await readFile(packagePath, 'utf-8'));
    return packageJson.version;
  } catch {
    return '0.0.0';
  }
}

async function getCommandDescription(filePath: string): Promise<string | undefined> {
  try {
    const content = await readFile(filePath, 'utf-8');
    // Look for description in comments at the top of the file
    const descMatch = content.match(/(?:\/\/|#)\s*@description\s+(.+)/);
    if (descMatch) {
      return descMatch[1].trim();
    }
    
    // Try to find README.md in the same directory
    const dir = path.dirname(filePath);
    const readmePath = path.join(dir, 'README.md');
    if (fs.existsSync(readmePath)) {
      const readme = await readFile(readmePath, 'utf-8');
      // Extract first line after heading
      const firstLine = readme.split('\n').find(line => line.trim() && !line.startsWith('#'));
      if (firstLine) {
        return firstLine.trim();
      }
    }
  } catch {
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
          // Check for nested command (e.g., file/rename/rename.js or .sh)
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
            description,
            usages: await commandUsages(commandPath, `hlpr ${category.name} ${item.name}`)
          });
        } else if (item.name.endsWith('.js')) {
          // Flat JavaScript command (e.g., help/help.js)
          const jsPath = path.join(categoryPath, item.name);
          const commandName = path.basename(item.name, '.js');
          if (commandName === category.name) {
            const description = await getCommandDescription(jsPath);
            commands.push({
              category: category.name,
              name: commandName,
              type: 'typescript',
              path: jsPath,
              description,
              usages: await commandUsages(jsPath, `hlpr ${commandName}`)
            });
          }
        } else if (item.name.endsWith('.sh')) {
          // Shell script command
          const shPath = path.join(categoryPath, item.name);
          const commandName = path.basename(item.name, '.sh');
          const description = await getCommandDescription(shPath);
          commands.push({
            category: category.name,
            name: commandName,
            type: 'shell',
            path: shPath,
            description,
            usages: await commandUsages(shPath, `hlpr ${category.name} ${commandName}`)
          });
        }
      }
    }
  } catch (error) {
    console.error('Error discovering commands:', error);
  }
  
  return commands;
}

function printHelp(commands: CommandInfo[], version: string) {
  console.log(renderHelp(commands, version));
}

async function main() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Look in both bin/commands (for built JS) and src/commands (for shell scripts)
    const binCommandsDir = path.join(__dirname, '..');
    const srcCommandsDir = path.join(__dirname, '..', '..', '..', 'src', 'commands');
    
    const version = await getVersion();
    const commands = [
      ...(await discoverCommands(binCommandsDir)),
      ...(await discoverCommands(srcCommandsDir))
    ];
    
    // Remove duplicates (prefer built JS over source)
    const uniqueCommands = commands.filter((cmd, index, self) => 
      index === self.findIndex(c => c.category === cmd.category && c.name === cmd.name)
    );
    
    printHelp(uniqueCommands, version);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
