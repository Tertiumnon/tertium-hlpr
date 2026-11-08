#!/usr/bin/env node
import { basename } from 'node:path'
import { formatTable, listProcesses } from '../list/list.utils.js'
import type { ProcessInfo } from '../list/list.utils.js'

// @description Find running processes by name or ID

export const parseTarget = (args: string[]): { name: string } | { id: number } => {
  if (args.length !== 2 || !args[1] || args[1].startsWith('-') || !['-name', '-id'].includes(args[0])) throw new Error('Usage: hlpr process find (-name <name> | -id <id>)')
  if (args[0] === '-id' && (!/^\d+$/.test(args[1]) || !Number.isSafeInteger(Number(args[1])) || Number(args[1]) < 1)) throw new Error('Invalid process ID; provide a positive integer')
  return args[0] === '-id' ? { id: Number(args[1]) } : { name: args[1] }
}

export const findProcesses = (processes: ProcessInfo[], target: { name: string } | { id: number }): ProcessInfo[] => {
  const matches = processes.filter(process => 'id' in target ? process.pid === target.id : basename(process.command).toLowerCase().includes(target.name.toLowerCase()))
  if (matches.length === 0) throw new Error('No processes match; check the name or ID')
  return matches
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr process find (-name <name> | -id <id>)')
    console.log('Alias: hlpr process search (-name <name> | -id <id>)')
    console.log('Find running processes by ID or case-insensitive name substring.')
  } else {
    try {
      const target = parseTarget(args)
      console.log(formatTable(findProcesses(listProcesses(), target)))
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`)
      process.exitCode = 1
    }
  }
}
