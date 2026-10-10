#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

// @description Install and enable oh-my-posh or starship in PowerShell

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

type Tool = keyof typeof tools

export function updateProfile(content: string, tool: Tool): string {
  const { init, other } = tools[tool]
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== other)
  while (lines[lines.length - 1] === '') lines.pop()
  if (!lines.some((line) => line.trim() === init)) lines.push(init)
  return `${lines.join('\n')}\n`
}

async function selectTool(value?: string): Promise<Tool> {
  if (value && value in tools) return value as Tool
  if (value) throw new Error(`Unknown tool: ${value} (use oh-my-posh or starship)`)

  console.log('1) oh-my-posh\n2) starship')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise<string>((resolve) => rl.question('Select tool: ', resolve))
  rl.close()
  if (answer === '1') return 'oh-my-posh'
  if (answer === '2') return 'starship'
  throw new Error('Invalid selection (use 1 or 2)')
}

async function main(): Promise<void> {
  if (process.platform !== 'win32') throw new Error('CLI tool installation is supported on Windows only')
  const tool = await selectTool(process.argv[2])
  const config = tools[tool]
  const install = spawnSync('winget', ['install', '--id', config.package, '--exact'], { stdio: 'inherit' })
  if (install.status !== 0) throw new Error(install.error?.message || `winget failed with exit code ${install.status}`)

  const usesPowerShellCore = process.env.PSModulePath?.split(path.delimiter).some((item) => /[\\/]PowerShell[\\/]Modules$/i.test(item))
  const powershell = usesPowerShellCore ? 'pwsh' : 'powershell.exe'
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
