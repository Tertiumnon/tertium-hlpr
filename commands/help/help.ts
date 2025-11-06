#!/usr/bin/env bun
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

interface CommandInfo {
  category: string;
  name: string;
  type: 'typescript' | 'shell';
  path: string;
  description?: string;
}

async function getVersion(): Promise<string> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packagePath = path.join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(await readFile(packagePath, 'utf-8'));
    return packageJson.version;
  } catch (error) {
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
          // Check for nested TypeScript command (e.g., file/rename/rename.ts)
          const nestedTsPath = path.join(categoryPath, item.name, `${item.name}.ts`);
          if (fs.existsSync(nestedTsPath)) {
            const description = await getCommandDescription(nestedTsPath);
            commands.push({
              category: category.name,
              name: item.name,
              type: 'typescript',
              path: nestedTsPath,
              description
            });
          }
        } else if (item.name.endsWith('.ts')) {
          // Flat TypeScript command (e.g., help/help.ts)
          const tsPath = path.join(categoryPath, item.name);
          const commandName = path.basename(item.name, '.ts');
          if (commandName !== 'test' && !commandName.endsWith('.test')) {
            const description = await getCommandDescription(tsPath);
            commands.push({
              category: category.name,
              name: commandName,
              type: 'typescript',
              path: tsPath,
              description
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
            description
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
  
  // Group commands by category
  const grouped = commands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandInfo[]>);
  
  // Sort categories
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
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const commandsDir = path.join(__dirname, '..');
    
    const version = await getVersion();
    const commands = await discoverCommands(commandsDir);
    
    printHelp(commands, version);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
