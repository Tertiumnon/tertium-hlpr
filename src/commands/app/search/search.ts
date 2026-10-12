#!/usr/bin/env node
import { installedApps, type App } from '../../../core/command/apps.js'

// @description Find installed apps by part of their name

export function matchingAppNames(apps: App[], name: string): string[] {
  const query = name.toLowerCase()
  return [...new Set(apps.filter(app => app.name.toLowerCase().includes(query)).map(app => app.name))]
    .sort((a, b) => a.localeCompare(b))
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.length === 1 && (args[0] === '-h' || args[0] === '--help')) {
    console.log('Usage: hlpr app search -name <name>\nAlias: hlpr app find -name <name>')
    return
  }
  if (args.length < 2 || args[0] !== '-name' || args.slice(1).some(value => !value.trim())) throw new Error('Usage: hlpr app search -name <name>')

  const name = args.slice(1).join(' ')
  const matches = matchingAppNames(installedApps(process.platform), name)
  if (matches.length) console.log(matches.join('\n'))
  else console.log(`No installed apps found matching "${name}".`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  try { main() } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  }
}
