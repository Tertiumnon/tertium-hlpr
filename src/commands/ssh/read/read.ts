#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { readHostBlock } from '../../../core/ssh/config.js'

// @description Print one connection's Host block from ~/.ssh/config

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr ssh read -file <connection-name>'

export function parseReadArgs(args: string[]): string {
  const [flag, alias] = args
  if (args.length !== 2 || (flag !== '-f' && flag !== '-file')) throw new Error(USAGE)
  if (!alias || alias.startsWith('-') || /\s/.test(alias)) throw new Error(USAGE)
  return alias
}

export async function readConnection(alias: string, configPath = path.join(os.homedir(), '.ssh', 'config')): Promise<string> {
  let config: string
  try {
    config = await readFile(configPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`No SSH config found at ${configPath}`)
    throw error
  }
  const block = readHostBlock(config, alias)
  if (block === undefined) throw new Error(`No Host entry "${alias}" in ${configPath}`)
  return block
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nPrints the Host block for the connection from ~/.ssh/config (the entry mkcon or mkkey writes).`)
    return
  }
  process.stdout.write(await readConnection(parseReadArgs(args)))
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
