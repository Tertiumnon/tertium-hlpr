#!/usr/bin/env bun
import { execSync, spawnSync } from 'node:child_process'
import { platform } from 'node:os'
import type { KillPortOptions } from '../../../core/command/command.types.js'

// @description Kill a process by ID or processes using a port

export type KillTarget = { id: number } | { port: number }

export function parseKillTarget(args: string[]): KillTarget {
  const idIndex = args.findIndex((arg) => arg === '-id' || arg === '--id')
  const portIndex = args.findIndex((arg) => arg === '-port' || arg === '--port')
  if ((idIndex >= 0) === (portIndex >= 0)) throw new Error('Specify exactly one of -id <id> or -port <port>')
  const index = idIndex >= 0 ? idIndex : portIndex
  const value = Number(args[index + 1])
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid ${idIndex >= 0 ? 'process ID' : 'port'}`)
  return idIndex >= 0 ? { id: value } : { port: value }
}

function getProcessOnWindowsPort(port: number): number[] {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' })
    const pids: number[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      const match = line.match(/\s+(\d+)\s*$/)
      if (match) {
        const pid = parseInt(match[1], 10)
        // Filter out invalid PIDs (0 is system, and avoid duplicates)
        if (pid > 0 && !pids.includes(pid)) {
          pids.push(pid)
        }
      }
    }
    return pids
  } catch {
    return []
  }
}

function getProcessOnLinuxPort(port: number): number[] {
  try {
    // Try lsof first (more reliable)
    const output = execSync(`lsof -i :${port} -n -P`, { encoding: 'utf-8' })
    const pids: number[] = []
    const lines = output.split('\n')

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/)
      if (parts.length > 1) {
        const pid = parseInt(parts[1], 10)
        if (!Number.isNaN(pid) && !pids.includes(pid)) {
          pids.push(pid)
        }
      }
    }
    return pids
  } catch {
    // Fallback to netstat if lsof is not available
    try {
      const output = execSync(`netstat -tulnp 2>/dev/null | grep :${port}`, { encoding: 'utf-8' })
      const pids: number[] = []
      const lines = output.split('\n')

      for (const line of lines) {
        const match = line.match(/(\d+)\//)
        if (match) {
          const pid = parseInt(match[1], 10)
          if (!pids.includes(pid)) {
            pids.push(pid)
          }
        }
      }
      return pids
    } catch {
      return []
    }
  }
}

function killProcessOnWindows(pid: number, force: boolean, verbose: boolean): boolean {
  try {
    const args = force ? ['/PID', pid.toString(), '/F'] : ['/PID', pid.toString()]
    const result = spawnSync('taskkill', args, { encoding: 'utf-8' })

    if (result.status === 0) {
      if (verbose) console.log(`✓ Killed process ${pid}`)
      return true
    } else {
      if (verbose) console.error(`✗ Failed to kill process ${pid}: ${result.stderr}`)
      return false
    }
  } catch (error) {
    if (verbose) console.error(`✗ Error killing process ${pid}: ${error}`)
    return false
  }
}

function killProcessOnLinux(pid: number, force: boolean, verbose: boolean): boolean {
  try {
    const signal = force ? 'SIGKILL' : 'SIGTERM'
    const result = spawnSync('kill', [`-${signal}`, pid.toString()], { encoding: 'utf-8' })

    if (result.status === 0) {
      if (verbose) console.log(`✓ Killed process ${pid} with ${signal}`)
      return true
    } else {
      if (verbose) console.error(`✗ Failed to kill process ${pid}: ${result.stderr}`)
      return false
    }
  } catch (error) {
    if (verbose) console.error(`✗ Error killing process ${pid}: ${error}`)
    return false
  }
}

export async function killPort(port: number, options: KillPortOptions = {}): Promise<{ killed: number[]; failed: number[] }> {
  const { force = false, verbose = false } = options

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port number: ${port}. Port must be between 1 and 65535.`)
  }

  const os = platform()
  let pids: number[] = []

  if (verbose) console.log(`Searching for processes on port ${port} (${os})...`)

  if (os === 'win32') {
    pids = getProcessOnWindowsPort(port)
  } else {
    pids = getProcessOnLinuxPort(port)
  }

  if (pids.length === 0) {
    if (verbose) console.log(`No processes found on port ${port}`)
    return { killed: [], failed: [] }
  }

  if (verbose) console.log(`Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`)

  const killed: number[] = []
  const failed: number[] = []

  for (const pid of pids) {
    let success: boolean

    if (os === 'win32') {
      success = killProcessOnWindows(pid, force, verbose)
    } else {
      success = killProcessOnLinux(pid, force, verbose)
    }

    if (success) {
      killed.push(pid)
    } else {
      failed.push(pid)
    }
  }

  return { killed, failed }
}

export async function killPid(pid: number, options: KillPortOptions = {}): Promise<boolean> {
  if (!Number.isInteger(pid) || pid <= 0) throw new Error(`Invalid process ID: ${pid}`)
  const { force = false, verbose = false } = options
  return platform() === 'win32' ? killProcessOnWindows(pid, force, verbose) : killProcessOnLinux(pid, force, verbose)
}

// CLI entry point
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log('Usage: hlpr process kill (-id <id> | -port <port>) [options]')
    console.log('Kill a process by ID or processes using a port')
    console.log()
    console.log('Targets:')
    console.log('  -id <id>              Process ID')
    console.log('  -port <port>          Port number (1-65535)')
    console.log()
    console.log('Options:')
    console.log('  -f, --force           Force kill (SIGKILL on Linux, /F on Windows)')
    console.log('  -v, --verbose         Show verbose output')
    console.log('  -h, --help            Show this help message')
    console.log()
    console.log('Examples:')
    console.log('  hlpr process kill -id 1234')
    console.log('  hlpr process kill -port 3000 --force')
    process.exit(0)
  }

  const force = args.includes('-f') || args.includes('--force')
  const verbose = args.includes('-v') || args.includes('--verbose')

  Promise.resolve()
    .then(async () => {
      const target = parseKillTarget(args)
      if ('id' in target) {
        const killed = await killPid(target.id, { force, verbose })
        if (!killed) throw new Error(`Failed to kill process ${target.id}`)
        console.log(`Killed process ${target.id}`)
        return
      }

      const result = await killPort(target.port, { force, verbose })
      if (result.failed.length > 0) throw new Error(`Failed to kill process(es): ${result.failed.join(', ')}`)
      console.log(result.killed.length > 0 ? `Killed ${result.killed.length} process(es) on port ${target.port}` : `No processes found on port ${target.port}`)
    })
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Error:', error.message)
      process.exit(1)
    })
}

export default { killPid, killPort }
