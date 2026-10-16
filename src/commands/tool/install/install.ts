#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'

// @description Install Docker, htop, fastfetch, Starship, Claude CLI, Codex CLI, Copilot CLI, or another supported tool

const tools = {
  'oh-my-posh': {
    package: 'JanDeDobbeleer.OhMyPosh',
    init: 'oh-my-posh init pwsh | Invoke-Expression',
    other: 'Invoke-Expression (&starship init powershell)',
  },
  starship: {
    package: 'Starship.Starship',
    init: 'Invoke-Expression (&starship init powershell)',
    other: 'oh-my-posh init pwsh | Invoke-Expression',
  },
} as const

// Global npm packages; each prints a hint about the command to run afterward.
const npmTools = {
  tldr: { package: 'tldr', next: 'Try: tldr tar' },
  'claude-cli': { package: '@anthropic-ai/claude-code', next: 'Run: claude' },
  'codex-cli': { package: '@openai/codex', next: 'Run: codex' },
  'copilot-cli': { package: '@github/copilot', next: 'Run: copilot' },
} as const

type PromptTool = keyof typeof tools
type NpmTool = keyof typeof npmTools
type Tool = PromptTool | NpmTool | 'psreadline' | 'pstop' | 'docker' | 'oh-my-zsh' | 'htop' | 'fastfetch'
type Platform = 'win32' | 'darwin' | 'linux'
type PackageManager = 'winget' | 'choco' | 'scoop' | 'brew' | 'apt-get' | 'dnf' | 'pacman'

export interface InstallCommand {
  command: string
  args: string[]
}

export function parseTool(value?: string): Tool | undefined {
  const normalized = value?.toLowerCase()
  return normalized === 'psreadline' || normalized === 'pstop' || normalized === 'docker' || normalized === 'oh-my-zsh' || normalized === 'htop' || normalized === 'fastfetch' || (normalized && Object.keys(tools).includes(normalized)) || (normalized && isNpmTool(normalized)) ? normalized as Tool : undefined
}

function isNpmTool(value: string): value is NpmTool {
  return Object.keys(npmTools).includes(value)
}

// Accepts "claude-cli" or "-name claude-cli" / "-n claude-cli". Other dash-prefixed arguments are rejected.
export function toolArgs(args: string[]): { value?: string; extra: string[] } {
  const [first, second, ...rest] = args
  if (first === '-n' || first === '-name') {
    if (!second) throw new Error('Missing tool name after -name')
    return { value: second, extra: rest }
  }
  if (first?.startsWith('-')) throw new Error(`Unknown option: ${first}`)
  return { value: first, extra: args.slice(1) }
}

function npmInstallCommand(pkg: string, platform: string): InstallCommand {
  return platform === 'win32'
    ? { command: 'cmd.exe', args: ['/d', '/c', 'npm.cmd', 'install', '--global', pkg] }
    : { command: 'npm', args: ['install', '--global', pkg] }
}

export function dockerInstallCommand(manager: PackageManager): InstallCommand {
  if (manager === 'winget') return { command: 'winget', args: ['install', '--id', 'Docker.DockerDesktop', '--exact'] }
  if (manager === 'brew') return { command: 'brew', args: ['install', '--cask', 'docker'] }
  if (manager === 'apt-get') return { command: 'sudo', args: ['apt-get', 'install', 'docker.io'] }
  if (manager === 'dnf') return { command: 'sudo', args: ['dnf', 'install', 'moby-engine', 'docker-cli'] }
  if (manager === 'pacman') return { command: 'sudo', args: ['pacman', '-S', 'docker'] }
  throw new Error(`Docker installation with ${manager} is not supported`)
}

export function utilityInstallCommand(tool: 'htop' | 'fastfetch', manager: PackageManager): InstallCommand {
  if (tool === 'htop' && (manager === 'winget' || manager === 'choco' || manager === 'scoop')) throw new Error('htop installation is supported on macOS and Linux only')
  if (manager === 'winget') return { command: 'winget', args: ['install', '--id', 'Fastfetch-cli.Fastfetch', '--exact'] }
  if (manager === 'choco' || manager === 'scoop') return { command: 'cmd.exe', args: ['/d', '/c', manager, 'install', tool] }
  if (manager === 'brew') return { command: 'brew', args: ['install', tool] }
  // shortcut: older Debian/Ubuntu repositories may lack fastfetch; use an upstream release when supporting them.
  if (manager === 'apt-get') return { command: 'sudo', args: ['apt-get', 'install', tool] }
  if (manager === 'dnf') return { command: 'sudo', args: ['dnf', 'install', tool] }
  return { command: 'sudo', args: ['pacman', '-S', tool] }
}

function availableManager(tool: 'htop' | 'fastfetch' | 'docker', platform: Platform): PackageManager {
  if (tool === 'htop' && platform === 'win32') throw new Error('htop installation is supported on macOS and Linux only')
  const managers: PackageManager[] = tool === 'docker'
    ? platform === 'win32' ? ['winget'] : platform === 'darwin' ? ['brew'] : ['apt-get', 'dnf', 'pacman']
    : platform === 'win32' ? ['winget', 'choco', 'scoop'] : platform === 'darwin' ? ['brew'] : ['apt-get', 'dnf', 'pacman', 'brew']
  const manager = managers.find(name => platform === 'win32'
    ? spawnSync('where.exe', [name], { stdio: 'ignore' }).status === 0
    : spawnSync(name, ['--version'], { stdio: 'ignore' }).status === 0)
  if (!manager) throw new Error(`No supported package manager found for ${tool} on ${platform}`)
  return manager
}

function run(commands: InstallCommand[]): void {
  for (const { command, args } of commands) {
    const result = spawnSync(command, args, { stdio: 'inherit' })
    if (result.status !== 0) throw new Error(result.error?.message || `${command} failed with exit code ${result.status}`)
  }
}

export function updateProfile(content: string, tool: PromptTool): string {
  const { init, other } = tools[tool]
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== other)
  while (lines[lines.length - 1] === '') lines.pop()
  if (!lines.some((line) => line.trim() === init)) lines.push(init)
  return `${lines.join('\n')}\n`
}

const psReadLineAutocomplete = 'Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete'
const psReadLinePrediction = [
  'Set-PSReadLineOption -PredictionSource History',
  'Set-PSReadLineOption -PredictionViewStyle ListView',
]

export function updatePsReadLineProfile(content: string): string {
  const lines = content.split(/\r?\n/)
  while (lines[lines.length - 1] === '') lines.pop()
  if (!lines.some((line) => line.trim() === psReadLineAutocomplete)) lines.push(psReadLineAutocomplete)
  const missingPrediction = psReadLinePrediction.filter((option) => !lines.some((line) => line.trim() === option))
  if (missingPrediction.length) lines.push('if ($Host.UI.SupportsVirtualTerminal -and -not [Console]::IsOutputRedirected) {', ...missingPrediction.map((option) => `    ${option}`), '}')
  return `${lines.join('\n')}\n`
}

const allPlatforms: Platform[] = ['win32', 'darwin', 'linux']
const toolPlatforms: Array<[Tool, string, Platform[]]> = [
  ['oh-my-posh', 'Windows · PowerShell', ['win32']],
  ['starship', 'Windows · PowerShell', ['win32']],
  ['psreadline', 'Windows · PowerShell', ['win32']],
  ['pstop', 'Windows', ['win32']],
  ['docker', 'Windows/macOS/Linux', allPlatforms],
  ['oh-my-zsh', 'Linux/macOS · Zsh; Windows · WSL', ['darwin', 'linux']],
  ['htop', 'macOS/Linux', ['darwin', 'linux']],
  ['fastfetch', 'Windows/macOS/Linux', allPlatforms],
  ['tldr', 'Windows/macOS/Linux · Node.js/npm', allPlatforms],
  ['claude-cli', 'Windows/macOS/Linux · Node.js/npm', allPlatforms],
  ['codex-cli', 'Windows/macOS/Linux · Node.js/npm', allPlatforms],
  ['copilot-cli', 'Windows/macOS/Linux · Node.js/npm', allPlatforms],
]

// Only tools that install on this platform, so the menu never offers a dead end.
export function menuFor(platform: string): Array<[Tool, string]> {
  return toolPlatforms
    .filter(([, , platforms]) => platforms.includes(platform as Platform))
    .map(([tool, compatibility]) => [tool, compatibility])
}

const menu = menuFor(process.platform)

export function moveSelection(index: number, direction: 'up' | 'down', count: number): number {
  return (index + (direction === 'up' ? -1 : 1) + count) % count
}

export function selectsTool(input: string, keyName?: string): boolean {
  return keyName === 'return' || keyName === 'enter' || keyName === 'space' || input === ' '
}

async function selectTool(value?: string): Promise<Tool | undefined> {
  const tool = parseTool(value)
  if (tool) return tool
  if (value) throw new Error(`Unknown tool: ${value}`)
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Select a tool in an interactive terminal, or pass its name')

  let selected = 0
  const render = () => {
    process.stdout.write(menu.map(([name, compatibility], index) =>
      `${index === selected ? '❯' : ' '} ${name.padEnd(11)} [${compatibility}]\x1b[K\n`).join(''))
  }

  console.log('Select a tool (↑/↓, Enter/Space; Esc to cancel):')
  render()
  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  try {
    return await new Promise<Tool | undefined>((resolve) => {
      const onKeypress = (_input: string, key: { name?: string; ctrl?: boolean }) => {
        if (selectsTool(_input, key.name)) {
          process.stdin.off('keypress', onKeypress)
          resolve(menu[selected][0])
        } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
          process.stdin.off('keypress', onKeypress)
          resolve(undefined)
        } else if (key.name === 'up' || key.name === 'down') {
          selected = moveSelection(selected, key.name, menu.length)
          process.stdout.write(`\x1b[${menu.length}A`)
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
    console.log('Usage: hlpr tool install [name]')
    console.log('Install Docker, htop, fastfetch, Starship, Claude CLI, Codex CLI, Copilot CLI, or another supported tool. Run without a name to choose from a keyboard menu. Also accepts -name <name>.')
    return
  }
  const { value, extra } = toolArgs(process.argv.slice(2))
  const tool = await selectTool(value)
  if (!tool) return
  if (extra.length) throw new Error(`${tool} does not accept extra arguments`)

  if (tool === 'docker') {
    const platform = process.platform
    if (platform !== 'win32' && platform !== 'darwin' && platform !== 'linux') throw new Error(`docker installation is not supported on ${platform}`)
    run([dockerInstallCommand(availableManager(tool, platform))])
    console.log('Installed Docker. Start Docker Desktop or the Docker service before use.')
    return
  }

  if (tool === 'htop' || tool === 'fastfetch') {
    const platform = process.platform
    if (platform !== 'win32' && platform !== 'darwin' && platform !== 'linux') throw new Error(`${tool} installation is not supported on ${platform}`)
    run([utilityInstallCommand(tool, availableManager(tool, platform))])
    console.log(`Installed ${tool}.`)
    return
  }

  if (isNpmTool(tool)) {
    const { package: pkg, next } = npmTools[tool]
    run([npmInstallCommand(pkg, process.platform)])
    console.log(`Installed ${tool}. ${next}`)
    return
  }

  if (tool === 'oh-my-zsh') {
    const zshDir = process.env.ZSH || path.join(os.homedir(), '.oh-my-zsh')
    if (fs.existsSync(zshDir)) {
      if (!fs.existsSync(path.join(zshDir, 'oh-my-zsh.sh'))) throw new Error(`${zshDir} exists but does not contain an oh-my-zsh installation`)
      console.log(`oh-my-zsh is already installed in ${zshDir}.`)
      return
    }
    const install = spawnSync('sh', ['-c', 'curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh | sh'], { stdio: 'inherit' })
    if (install.status !== 0) throw new Error(install.error?.message || `oh-my-zsh installation failed with exit code ${install.status}`)
    console.log('Installed oh-my-zsh. Restart your shell to apply.')
    return
  }

  if (process.platform !== 'win32') throw new Error(`${tool} installation is supported on Windows only`)
  const usesPowerShellCore = process.env.PSModulePath?.split(path.delimiter).some((item) => /[\\/]PowerShell[\\/]Modules$/i.test(item))
  const powershell = usesPowerShellCore ? 'pwsh' : 'powershell.exe'

  if (tool === 'psreadline') {
    const install = spawnSync(powershell, ['-NoProfile', '-Command', 'Install-Module -Name PSReadLine -AllowClobber -Force -Scope CurrentUser'], { stdio: 'inherit' })
    if (install.status !== 0) throw new Error(install.error?.message || `PowerShell failed with exit code ${install.status}`)

    const profileResult = spawnSync(powershell, ['-NoProfile', '-Command', '$PROFILE'], { encoding: 'utf8' })
    if (profileResult.status !== 0) throw new Error(profileResult.stderr.trim() || 'Could not find the PowerShell profile')
    const profile = profileResult.stdout.trim()
    if (!profile) throw new Error('PowerShell returned an empty profile path')
    fs.mkdirSync(path.dirname(profile), { recursive: true })
    const content = fs.existsSync(profile) ? fs.readFileSync(profile, 'utf8') : ''
    fs.writeFileSync(profile, updatePsReadLineProfile(content))
    console.log('Installed PSReadLine with Tab completion and history predictions. Restart PowerShell to apply.')
    return
  }

  if (tool === 'pstop') {
    const install = spawnSync('winget', ['install', '--id', 'marlocarlo.pstop', '--exact'], { stdio: 'inherit' })
    if (install.status !== 0) throw new Error(install.error?.message || `winget failed with exit code ${install.status}`)
    console.log('Installed pstop.')
    return
  }

  const config = tools[tool]
  const install = spawnSync('winget', ['install', '--id', config.package, '--exact'], { stdio: 'inherit' })
  if (install.status !== 0) throw new Error(install.error?.message || `winget failed with exit code ${install.status}`)

  const profileResult = spawnSync(powershell, ['-NoProfile', '-Command', '$PROFILE'], { encoding: 'utf8' })
  if (profileResult.status !== 0) throw new Error(profileResult.stderr.trim() || 'Could not find the PowerShell profile')
  const profile = profileResult.stdout.trim()
  if (!profile) throw new Error('PowerShell returned an empty profile path')

  fs.mkdirSync(path.dirname(profile), { recursive: true })
  const content = fs.existsSync(profile) ? fs.readFileSync(profile, 'utf8') : ''
  fs.writeFileSync(profile, updateProfile(content, tool))
  console.log(`Configured ${tool} in ${profile}`)
  console.log('Done. Restart PowerShell to apply.')
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  })
}
