#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

// @description List running processes

export interface ProcessInfo {
  pid: number
  state: string
  command: string
}

export function parseWindowsProcesses(output: string): ProcessInfo[] {
  return output.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^"([^"]+)","(\d+)"/)
    return match ? [{ pid: Number(match[2]), state: 'RUNNING', command: match[1] }] : []
  })
}

export function parseUnixProcesses(output: string): ProcessInfo[] {
  return output.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*(\d+)\s+(\S+)\s+(.+)$/)
    return match ? [{ pid: Number(match[1]), state: match[2], command: match[3] }] : []
  })
}

export function listProcesses(): ProcessInfo[] {
  if (process.platform === 'win32') {
    return parseWindowsProcesses(execFileSync('tasklist', ['/FO', 'CSV', '/NH'], { encoding: 'utf8' }))
  }
  return parseUnixProcesses(execFileSync('ps', ['-eo', 'pid=,state=,comm='], { encoding: 'utf8' }))
}

function formatTable(processes: ProcessInfo[]): string {
  const pidWidth = Math.max(3, ...processes.map(({ pid }) => String(pid).length))
  const stateWidth = Math.max(5, ...processes.map(({ state }) => state.length))
  const header = `${'PID'.padEnd(pidWidth)}  ${'STATE'.padEnd(stateWidth)}  COMMAND`
  return [header, ...processes.map(({ pid, state, command }) => `${String(pid).padEnd(pidWidth)}  ${state.padEnd(stateWidth)}  ${command}`)].join('\n')
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log('Usage: hlpr list process')
    console.log('List running processes')
    process.exit(0)
  }

  try {
    console.log(formatTable(listProcesses()))
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}
