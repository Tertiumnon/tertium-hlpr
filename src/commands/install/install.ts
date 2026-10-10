#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

// @description Install compatible command-line tools

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

type PromptTool = keyof typeof tools
type RuntimeTool = 'node' | 'python' | 'bun'
type Tool = PromptTool | RuntimeTool | 'psreadline' | 'pstop' | 'nvm' | 'oh-my-zsh' | 'tldr'
type Platform = 'win32' | 'darwin' | 'linux'

export interface InstallCommand {
  command: string
  args: string[]
}

const runtimeTools: RuntimeTool[] = ['node', 'python', 'bun']
// shortcut: winget and Homebrew expose Node LTS by release line, update when the active LTS major changes.
const nodeLtsMajor = '24'

function isRuntimeTool(tool: Tool): tool is RuntimeTool {
  return runtimeTools.includes(tool as RuntimeTool)
}

export function parseTool(value?: string): Tool | undefined {
  const normalized = value?.toLowerCase()
  return normalized === 'psreadline' || normalized === 'pstop' || normalized === 'nvm' || normalized === 'oh-my-zsh' || normalized === 'tldr' || runtimeTools.includes(normalized as RuntimeTool) || (normalized && normalized in tools) ? normalized as Tool : undefined
}

export function parseVersion(args: string[]): string | undefined {
  if (args.length === 0) return undefined
  if (args.length !== 2 || !['-v', '-version'].includes(args[0]) || !/^\d+$/.test(args[1])) throw new Error('Version must be a major number, for example: -v 24')
  return args[1]
}

export function runtimeInstallCommands(tool: RuntimeTool, platform: Platform, version?: string): InstallCommand[] {
  if (tool === 'node') {
    if (platform === 'win32') {
      if (version && version !== nodeLtsMajor) throw new Error(`winget currently supports Node ${nodeLtsMajor} through its LTS package`)
      return [{ command: 'winget', args: ['install', '--id', 'OpenJS.NodeJS.LTS', '--exact'] }]
    }
    if (platform === 'darwin') return [{ command: 'brew', args: ['install', `node@${version || nodeLtsMajor}`] }]
    const channel = version ? `${version}.x` : 'lts.x'
    return [
      { command: 'sh', args: ['-c', `curl -fsSL https://deb.nodesource.com/setup_${channel} | sudo -E bash -`] },
      { command: 'sudo', args: ['apt-get', 'install', '-y', 'nodejs'] },
    ]
  }

  if (tool === 'python') {
    if (version && version !== '3') throw new Error('Python currently supports major version 3')
    if (platform === 'win32') return [
      { command: 'winget', args: ['install', '--id', '9NQ7512CXL7T', '--exact', '--accept-package-agreements', '--disable-interactivity'] },
      { command: 'py', args: ['install', version || '3'] },
    ]
    if (platform === 'darwin') return [{ command: 'brew', args: ['install', 'python'] }]
    return [
      { command: 'sudo', args: ['apt-get', 'update'] },
      { command: 'sudo', args: ['apt-get', 'install', '-y', 'python3'] },
    ]
  }

  if (version && version !== '1') throw new Error('Bun currently supports major version 1')
  if (platform === 'win32') return [{ command: 'powershell.exe', args: ['-NoProfile', '-Command', 'irm bun.sh/install.ps1 | iex'] }]
  if (platform === 'darwin') return [
    { command: 'brew', args: ['tap', 'oven-sh/bun'] },
    { command: 'brew', args: ['install', 'bun'] },
  ]
  return [{ command: 'sh', args: ['-c', 'curl -fsSL https://bun.sh/install | bash'] }]
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

const menu: Array<[Tool, string]> = [
  ['oh-my-posh', 'Windows · PowerShell'],
  ['starship', 'Windows · PowerShell'],
  ['psreadline', 'Windows · PowerShell'],
  ['pstop', 'Windows'],
  ['nvm', 'Linux/macOS · Bash; Windows · Git Bash/WSL'],
  ['oh-my-zsh', 'Linux/macOS · Zsh; Windows · WSL'],
  ['node', 'Windows/macOS/Debian/Ubuntu'],
  ['python', 'Windows/macOS/Debian/Ubuntu'],
  ['bun', 'Windows/macOS/Debian/Ubuntu'],
  ['tldr', 'Windows/macOS/Linux · Node.js/npm'],
]

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
  const tool = await selectTool(process.argv[2])
  if (!tool) return

  if (tool === 'tldr') {
    run([process.platform === 'win32'
      ? { command: 'cmd.exe', args: ['/d', '/c', 'npm.cmd', 'install', '--global', 'tldr'] }
      : { command: 'npm', args: ['install', '--global', 'tldr'] }])
    console.log('Installed tldr. Try: tldr tar')
    return
  }

  if (isRuntimeTool(tool)) {
    const platform = process.platform
    if (platform !== 'win32' && platform !== 'darwin' && platform !== 'linux') throw new Error(`${tool} installation is not supported on ${platform}`)
    const version = parseVersion(process.argv.slice(3))
    run(runtimeInstallCommands(tool, platform, version))
    console.log(`Installed ${tool}${version ? ` ${version}` : ''}. Restart your shell to apply.`)
    return
  }

  if (tool === 'nvm') {
    const install = spawnSync('bash', ['-c', 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash'], { stdio: 'inherit' })
    if (install.status !== 0) throw new Error(install.error?.message || `nvm installation failed with exit code ${install.status}`)
    console.log('Installed nvm. Restart your shell to apply.')
    return
  }

  if (tool === 'oh-my-zsh') {
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
