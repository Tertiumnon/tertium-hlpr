#!/usr/bin/env bun
import { execFileSync, execSync, spawnSync } from 'node:child_process'
import { readdirSync, readlinkSync, statSync } from 'node:fs'
import { platform } from 'node:os'
import { dirname, resolve } from 'node:path'
import type { KillPortOptions } from '../../../core/command/command.types.js'

// @description Kill a process by ID, processes using a port, or processes running in a folder or from a file

export type KillTarget = { id: number } | { port: number } | { path: string }

export function parseKillTarget(args: string[]): KillTarget {
  const idIndex = args.findIndex((arg) => arg === '-id' || arg === '--id')
  const portIndex = args.findIndex((arg) => arg === '-port' || arg === '--port')
  const pathIndex = args.findIndex((arg) => ['-folder', '--folder', '-file', '--file', '-path', '--path'].includes(arg))
  if ([idIndex, portIndex, pathIndex].filter((index) => index >= 0).length !== 1) throw new Error('Specify exactly one of -id <id>, -port <port>, or -folder/-file/-path <path>')
  if (pathIndex >= 0) {
    if (!args[pathIndex + 1]) throw new Error(`Missing ${args[pathIndex].replace(/^-+/, '')} path`)
    return { path: resolve(args[pathIndex + 1]) }
  }
  const index = idIndex >= 0 ? idIndex : portIndex
  const value = Number(args[index + 1])
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid ${idIndex >= 0 ? 'process ID' : 'port'}`)
  return idIndex >= 0 ? { id: value } : { port: value }
}

// ponytail: Windows only sees executable path and command line, not the working directory (needs a native handle/PEB lookup)
function listWindowsProcesses(): { pid: number; ppid: number; exe: string; command: string }[] {
  const output = execFileSync('powershell', ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress'], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })
  const rows = JSON.parse(output.trim() || '[]')
  return (Array.isArray(rows) ? rows : [rows]).map((row) => ({ pid: row.ProcessId, ppid: row.ParentProcessId, exe: row.ExecutablePath ?? '', command: row.CommandLine ?? '' }))
}

// PIDs of hlpr and every ancestor (the shells that started it); these are never killed
function ancestorsOf(parents: Map<number, number>): Set<number> {
  const found = new Set<number>([process.pid])
  let pid = process.pid
  while (parents.has(pid) && !found.has(parents.get(pid) as number)) {
    pid = parents.get(pid) as number
    found.add(pid)
  }
  return found
}

function listUnixParents(): Map<number, number> {
  const output = execFileSync('ps', ['-eo', 'pid=,ppid='], { encoding: 'utf-8' })
  return new Map(output.split('\n').flatMap((line): [number, number][] => {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number)
    return Number.isInteger(pid) && Number.isInteger(ppid) ? [[pid, ppid]] : []
  }))
}

// Returns [pid, working directory] pairs; Linux reads /proc, macOS asks lsof
function listWorkingDirectories(): [number, string][] {
  if (platform() === 'linux') {
    return readdirSync('/proc')
      .filter((name) => /^\d+$/.test(name))
      .flatMap((name): [number, string][] => {
        try {
          return [[Number(name), readlinkSync(`/proc/${name}/cwd`)]]
        } catch {
          return []
        }
      })
  }
  let output = ''
  try {
    output = execFileSync('lsof', ['-a', '-d', 'cwd', '-Fpn'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch (error) {
    // lsof exits non-zero when some processes are not readable or none match; keep what it printed
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('lsof is required to find processes by path')
    output = (error as { stdout?: string }).stdout ?? ''
  }
  const pairs: [number, string][] = []
  let pid = 0
  for (const line of output.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1))
    else if (line.startsWith('n')) pairs.push([pid, line.slice(1)])
  }
  return pairs
}

// Matches a folder (and everything under it) or a single file; a command line must name the path at a boundary
export function findProcessesAt(target: string): number[] {
  const windows = platform() === 'win32'
  const sep = windows ? '\\' : '/'
  const fold = (value: string) => (windows ? value.toLowerCase() : value)
  const dir = fold(target)
  const prefix = dir.endsWith(sep) ? dir : dir + sep
  const inside = (path: string) => {
    const value = fold(path)
    return value === dir || value.startsWith(prefix)
  }
  const mentions = (command: string) => {
    const text = fold(command)
    for (let i = text.indexOf(dir); i >= 0; i = text.indexOf(dir, i + 1)) {
      const next = text[i + dir.length]
      if (next === undefined || next === sep || next === '"' || next === ' ') return true
    }
    return false
  }
  const pids = new Set<number>()
  let parents: Map<number, number>
  if (windows) {
    const rows = listWindowsProcesses()
    parents = new Map(rows.map((row) => [row.pid, row.ppid]))
    for (const row of rows) {
      if (inside(row.exe) || mentions(row.command)) pids.add(row.pid)
    }
  } else {
    parents = listUnixParents()
    for (const [pid, cwd] of listWorkingDirectories()) {
      if (inside(cwd)) pids.add(pid)
    }
  }
  // The shell that started hlpr often sits in the folder or names it in its command line; never kill it
  for (const pid of ancestorsOf(parents)) pids.delete(pid)
  return [...pids]
}

export async function killPath(target: string, options: KillPortOptions = {}): Promise<{ killed: number[]; failed: number[] }> {
  const path = resolve(target)
  const stat = statSync(path, { throwIfNoEntry: false })
  if (!stat) throw new Error(`Path not found: ${target}`)
  if (stat.isDirectory() && dirname(path) === path) throw new Error('Refusing to kill processes in a filesystem root')

  const { force = false, verbose = false } = options
  if (verbose) console.log(`Searching for processes at ${path}...`)
  const pids = findProcessesAt(path)
  if (pids.length === 0) {
    if (verbose) console.log(`No processes found at ${path}`)
    return { killed: [], failed: [] }
  }
  if (verbose) console.log(`Found ${pids.length} process(es) at ${path}: ${pids.join(', ')}`)

  const killed: number[] = []
  const failed: number[] = []
  for (const pid of pids) {
    if (await killPid(pid, { force, verbose })) killed.push(pid)
    else failed.push(pid)
  }
  return { killed, failed }
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

    // "not found" means it exited on its own, for example when its parent was killed first
    if (result.status === 0 || /not found/i.test(`${result.stdout}${result.stderr}`)) {
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
    console.log('Usage: hlpr process kill (-id <id> | -port <port> | -folder|-file|-path <path>) [options]')
    console.log('Kill a process by ID, processes using a port, or processes running in a folder or from a file')
    console.log()
    console.log('Targets:')
    console.log('  -id <id>              Process ID')
    console.log('  -port <port>          Port number (1-65535)')
    console.log('  -folder <path>        Processes running from or in the folder (also -path)')
    console.log('  -file <path>          Processes running from the file (also -path)')
    console.log()
    console.log('Options:')
    console.log('  -f, --force           Force kill (SIGKILL on Linux, /F on Windows)')
    console.log('  -v, --verbose         Show verbose output')
    console.log('  -h, --help            Show this help message')
    console.log()
    console.log('Examples:')
    console.log('  hlpr process kill -id 1234')
    console.log('  hlpr process kill -port 3000 --force')
    console.log('  hlpr process kill -folder ./build')
    console.log('  hlpr process kill -file ./app.exe')
    process.exit(0)
  }

  const force = args.includes('-f') || args.includes('--force')
  const verbose = args.includes('-v') || args.includes('--verbose')

  Promise.resolve()
    .then(async () => {
      const target = parseKillTarget(args)
      if ('path' in target) {
        const result = await killPath(target.path, { force, verbose })
        if (result.failed.length > 0) throw new Error(`Failed to kill process(es): ${result.failed.join(', ')}`)
        console.log(result.killed.length > 0 ? `Killed ${result.killed.length} process(es) at ${target.path}` : `No processes found at ${target.path}`)
        return
      }
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

export default { killPid, killPort, killPath }
