#!/usr/bin/env node
import { readdirSync } from 'node:fs'
import path from 'node:path'

// @description Find files by part of their name

export function findFiles(root: string, name: string): string[] {
  const matches: string[] = []
  const directories = [root]
  const query = name.toLowerCase()
  while (directories.length) {
    const directory = directories.pop()
    if (!directory) break
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) directories.push(fullPath)
      else if (entry.isFile() && entry.name.toLowerCase().includes(query)) matches.push(path.relative(root, fullPath))
    }
  }
  return matches.sort((a, b) => a.localeCompare(b))
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.length === 1 && (args[0] === '-h' || args[0] === '--help')) {
    console.log('Usage: hlpr file find -name <name>\nAlias: hlpr file search -name <name>')
    return
  }
  if (args.length < 2 || args[0] !== '-name' || args.slice(1).some(value => !value.trim())) throw new Error('Usage: hlpr file find -name <name>')
  const name = args.slice(1).join(' ')
  const matches = findFiles(process.cwd(), name)
  console.log(matches.length ? matches.join('\n') : `No files found matching "${name}".`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  try { main() } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  }
}
