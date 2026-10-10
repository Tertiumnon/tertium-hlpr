#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

// @description List apps installed by the operating system package manager

type Platform = 'win32' | 'darwin' | 'linux'

export function installedAppsCommand(platform: Platform): { command: string; args: string[] } {
  if (platform === 'win32') return { command: 'winget', args: ['list'] }
  if (platform === 'darwin') return { command: 'brew', args: ['list', '--versions'] }
  return { command: 'apt', args: ['list', '--installed'] }
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log('Usage: hlpr list app -installed')
    process.exit(0)
  }
  if (args.length !== 1 || args[0] !== '-installed') {
    console.error('Usage: hlpr list app -installed')
    process.exit(1)
  }

  const platform = process.platform
  if (platform !== 'win32' && platform !== 'darwin' && platform !== 'linux') {
    console.error(`Error: app listing is not supported on ${platform}`)
    process.exit(1)
  }

  const { command, args: commandArgs } = installedAppsCommand(platform)
  const result = spawnSync(command, commandArgs, { stdio: 'inherit' })
  if (result.status !== 0) {
    console.error(`Error: ${result.error?.message || `${command} failed with exit code ${result.status}`}`)
    process.exit(1)
  }
}
