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
type Tool = PromptTool | RuntimeTool | 'psreadline' | 'pstop' | 'nvm' | 'oh-my-zsh'
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
  return normalized === 'psreadline' || normalized === 'pstop' || normalized === 'nvm' || normalized === 'oh-my-zsh' || runtimeTools.includes(normalized as RuntimeTool) || (normalized && normalized in tools) ? normalized as Tool : undefined
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

async function selectTool(value?: string): Promise<Tool> {
  const tool = parseTool(value)
  if (tool) return tool
  if (value) throw new Error(`Unknown tool: ${value}`)

  console.log('1) oh-my-posh [Windows · PowerShell]\n2) starship    [Windows · PowerShell]\n3) PSReadLine  [Windows · PowerShell]\n4) pstop       [Windows]\n5) nvm         [Linux/macOS · Bash; Windows · Git Bash/WSL]\n6) oh-my-zsh   [Linux/macOS · Zsh; Windows · WSL]\n7) node        [Windows/macOS/Debian/Ubuntu]\n8) python      [Windows/macOS/Debian/Ubuntu]\n9) bun         [Windows/macOS/Debian/Ubuntu]')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise<string>((resolve) => rl.question('Select tool: ', resolve))
  rl.close()
  if (answer === '1') return 'oh-my-posh'
  if (answer === '2') return 'starship'
  if (answer === '3') return 'psreadline'
  if (answer === '4') return 'pstop'
  if (answer === '5') return 'nvm'
  if (answer === '6') return 'oh-my-zsh'
  if (answer === '7') return 'node'
  if (answer === '8') return 'python'
  if (answer === '9') return 'bun'
  throw new Error('Invalid selection (use 1-9)')
}

async function main(): Promise<void> {
  const tool = await selectTool(process.argv[2])

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
    console.log('Installed PSReadLine. Restart PowerShell to apply.')
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
