#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import readline from 'node:readline'

// @description Install Node.js, Python, Bun, Rust, or Go

type Runtime = 'node' | 'python' | 'bun' | 'rust' | 'go'
type Platform = 'win32' | 'darwin' | 'linux'
type LinuxManager = 'apt-get' | 'dnf' | 'pacman'

export interface InstallCommand {
  command: string
  args: string[]
}

const runtimes: Runtime[] = ['node', 'python', 'bun', 'rust', 'go']
// shortcut: winget and Homebrew expose Node LTS by release line, update when the active LTS major changes.
const nodeLtsMajor = '24'

export function parseRuntime(value?: string): Runtime | undefined {
  const normalized = value?.toLowerCase()
  return runtimes.find(runtime => runtime === normalized)
}

export function parseVersion(args: string[]): string | undefined {
  if (args.length === 0) return undefined
  if (args.length !== 2 || !['-v', '-version'].includes(args[0]) || !/^\d+$/.test(args[1])) throw new Error('Version must be a major number, for example: -v 24')
  return args[1]
}

export function runtimeInstallCommands(runtime: Runtime, platform: Platform, version?: string, manager?: LinuxManager): InstallCommand[] {
  if (runtime === 'node') {
    if (platform === 'win32') {
      if (version && version !== nodeLtsMajor) throw new Error(`winget currently supports Node ${nodeLtsMajor} through its LTS package`)
      return [{ command: 'winget', args: ['install', '--id', 'OpenJS.NodeJS.LTS', '--exact'] }]
    }
    if (platform === 'darwin') return [{ command: 'brew', args: ['install', `node@${version || nodeLtsMajor}`] }]
    if (manager && manager !== 'apt-get') throw new Error('Node installation currently supports Debian/Ubuntu only on Linux')
    const channel = version ? `${version}.x` : 'lts.x'
    return [
      { command: 'sh', args: ['-c', `curl -fsSL https://deb.nodesource.com/setup_${channel} | sudo -E bash -`] },
      { command: 'sudo', args: ['apt-get', 'install', '-y', 'nodejs'] },
    ]
  }

  if (runtime === 'python') {
    if (version && version !== '3') throw new Error('Python currently supports major version 3')
    if (platform === 'win32') return [
      { command: 'winget', args: ['install', '--id', '9NQ7512CXL7T', '--exact', '--accept-package-agreements', '--disable-interactivity'] },
      { command: 'py', args: ['install', version || '3'] },
    ]
    if (platform === 'darwin') return [{ command: 'brew', args: ['install', 'python'] }]
    if (manager && manager !== 'apt-get') throw new Error('Python installation currently supports Debian/Ubuntu only on Linux')
    return [
      { command: 'sudo', args: ['apt-get', 'update'] },
      { command: 'sudo', args: ['apt-get', 'install', '-y', 'python3'] },
    ]
  }

  if (runtime === 'bun') {
    if (version && version !== '1') throw new Error('Bun currently supports major version 1')
    if (platform === 'win32') return [{ command: 'powershell.exe', args: ['-NoProfile', '-Command', 'irm bun.sh/install.ps1 | iex'] }]
    if (platform === 'darwin') return [
      { command: 'brew', args: ['tap', 'oven-sh/bun'] },
      { command: 'brew', args: ['install', 'bun'] },
    ]
    return [{ command: 'sh', args: ['-c', 'curl -fsSL https://bun.sh/install | bash'] }]
  }

  if (version) throw new Error(`${runtime} does not support -v; install the distribution's current version`)
  if (platform === 'win32') return [{ command: 'winget', args: ['install', '--id', runtime === 'rust' ? 'Rustlang.Rustup' : 'GoLang.Go', '--exact'] }]
  if (platform === 'darwin') return [{ command: 'brew', args: ['install', runtime] }]
  if (manager === 'apt-get') return [{ command: 'sudo', args: ['apt-get', 'install', ...(runtime === 'rust' ? ['rustc', 'cargo'] : ['golang-go'])] }]
  if (manager === 'dnf') return [{ command: 'sudo', args: ['dnf', 'install', ...(runtime === 'rust' ? ['rust', 'cargo'] : ['golang'])] }]
  if (manager === 'pacman') return [{ command: 'sudo', args: ['pacman', '-S', runtime === 'rust' ? 'rust' : 'go'] }]
  throw new Error('No supported package manager found on Linux')
}

export function moveSelection(index: number, direction: 'up' | 'down', count: number): number {
  return (index + (direction === 'up' ? -1 : 1) + count) % count
}

export function selectsRuntime(input: string, keyName?: string): boolean {
  return keyName === 'return' || keyName === 'enter' || keyName === 'space' || input === ' '
}

async function selectRuntime(value?: string): Promise<Runtime | undefined> {
  const runtime = parseRuntime(value)
  if (runtime) return runtime
  if (value) throw new Error(`Unknown runtime: ${value}`)
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Select a runtime in an interactive terminal, or pass its name')

  let selected = 0
  const render = () => process.stdout.write(runtimes.map((name, index) => `${index === selected ? '❯' : ' '} ${name}\x1b[K\n`).join(''))
  console.log('Select a runtime (↑/↓, Enter/Space; Esc to cancel):')
  render()
  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  try {
    return await new Promise<Runtime | undefined>((resolve) => {
      const onKeypress = (input: string, key: { name?: string; ctrl?: boolean }) => {
        if (selectsRuntime(input, key.name)) {
          process.stdin.off('keypress', onKeypress)
          resolve(runtimes[selected])
        } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
          process.stdin.off('keypress', onKeypress)
          resolve(undefined)
        } else if (key.name === 'up' || key.name === 'down') {
          selected = moveSelection(selected, key.name, runtimes.length)
          process.stdout.write(`\x1b[${runtimes.length}A`)
          render()
        }
      }
      process.stdin.on('keypress', onKeypress)
    })
  } finally {
    process.stdin.setRawMode(false)
    process.stdin.pause()
    process.stdout.write('\n')
  }
}

async function main(): Promise<void> {
  if (process.argv.slice(2).some(arg => arg === '--help' || arg === '-h')) {
    console.log('Usage: hlpr runtime install [name] [-v 24]')
    console.log('Install Node.js, Python, Bun, Rust, or Go. Run without a name to choose from a keyboard menu. -v is supported for Node.js, Python, and Bun.')
    return
  }
  const runtime = await selectRuntime(process.argv[2])
  if (!runtime) return
  const platform = process.platform
  if (platform !== 'win32' && platform !== 'darwin' && platform !== 'linux') throw new Error(`${runtime} installation is not supported on ${platform}`)
  const version = parseVersion(process.argv.slice(3))
  const manager = platform === 'linux' && runtime !== 'bun'
    ? (['apt-get', 'dnf', 'pacman'] as const).find(name => spawnSync(name, ['--version'], { stdio: 'ignore' }).status === 0)
    : undefined
  if (platform === 'linux' && runtime !== 'bun' && !manager) throw new Error('No supported package manager found on Linux')
  for (const { command, args } of runtimeInstallCommands(runtime, platform, version, manager)) {
    const result = spawnSync(command, args, { stdio: 'inherit' })
    if (result.status !== 0) throw new Error(result.error?.message || `${command} failed with exit code ${result.status}`)
  }
  console.log(`Installed ${runtime}${version ? ` ${version}` : ''}. Restart your shell to apply.`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  })
}
