#!/usr/bin/env node
import { basename } from 'node:path'
import { formatTable, listProcesses } from '../list/list.utils.js'
import type { ProcessInfo } from '../list/list.utils.js'

// @description Find running processes by name or ID

export const parseTarget = (args: string[]): { name: string } | { id: number } => {
  const match = args.length === 1 ? args[0].match(/^--(name|id)=(.+)$/s) : undefined
  if (!match) throw new Error('Usage: hlpr process find (--name=<name> | --id=<id>)')
  if (match[1] === 'id' && (!/^\d+$/.test(match[2]) || !Number.isSafeInteger(Number(match[2])) || Number(match[2]) < 1)) throw new Error('Invalid process ID; provide a positive integer')
  return match[1] === 'id' ? { id: Number(match[2]) } : { name: match[2] }
}

export const findProcesses = (processes: ProcessInfo[], target: { name: string } | { id: number }): ProcessInfo[] => {
  const matches = processes.filter(process => 'id' in target ? process.pid === target.id : basename(process.command).toLowerCase().includes(target.name.toLowerCase()))
  if (matches.length === 0) throw new Error('No processes match; check the name or ID')
  return matches
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr process find (--name=<name> | --id=<id>)')
    console.log('Alias: hlpr process search (--name=<name> | --id=<id>)')
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
