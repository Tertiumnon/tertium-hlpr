#!/usr/bin/env node
import { installedApps, remoteApps, type App } from '../../../core/command/apps.js'

// @description Find installed apps or remote packages by part of their name

export function matchingAppNames(apps: App[], name: string): string[] {
  const query = name.toLowerCase()
  return [...new Set(apps.filter(app => app.name.toLowerCase().includes(query)).map(app => app.name))]
    .sort((a, b) => a.localeCompare(b))
}

export function matchingRemoteApps(apps: App[], name: string): string[] {
  const query = name.toLowerCase()
  return [...new Set(apps.filter(app => app.name.toLowerCase().includes(query)).map(app => `${app.name} [${app.manager}]`))]
    .sort((a, b) => a.localeCompare(b))
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.length === 1 && (args[0] === '-h' || args[0] === '--help')) {
    console.log('Usage: hlpr app search -name <name> [--remote]\nAlias: hlpr app find -name <name> [--remote]')
    return
  }
  const remote = args.includes('--remote')
  const nameArgs = args.filter(value => value !== '--remote')
  if (nameArgs.length < 2 || nameArgs[0] !== '-name' || nameArgs.slice(1).some(value => !value.trim())) throw new Error('Usage: hlpr app search -name <name> [--remote]')

  const name = nameArgs.slice(1).join(' ')
  const matches = remote
    ? matchingRemoteApps(remoteApps(process.platform, name), name)
    : matchingAppNames(installedApps(process.platform), name)
  if (matches.length) console.log(matches.join('\n'))
  else console.log(remote ? `No remote packages found matching "${name}".` : `No installed apps found matching "${name}".`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  try { main() } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  }
}
