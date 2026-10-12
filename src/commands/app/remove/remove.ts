#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import readline from 'node:readline'
import { installedApps, uninstallCommand } from '../../../core/command/apps.js'

export { parsePackages, uninstallCommand } from '../../../core/command/apps.js'

// @description Find and uninstall an app from an available package manager

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length === 1 && ['-h', '--help'].includes(args[0])) {
    console.log('Usage: hlpr app remove -name <app name>\nAliases: hlpr app delete, hlpr app uninstall')
    return
  }
  if (args.length < 2 || args[0] !== '-name' || args.slice(1).some(value => !value.trim())) throw new Error('Usage: hlpr app remove -name <app name>')
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Select an app in an interactive terminal')
  const search = args.slice(1).join(' ').toLowerCase()
  const apps = installedApps(process.platform).filter(app => `${app.name} ${app.id}`.toLowerCase().includes(search))
  if (!apps.length) { console.log(`No installed apps found matching "${args.slice(1).join(' ')}".`); return }
  apps.forEach((app, index) => { console.log(`${index + 1}. ${app.name} (${app.id}) [${app.manager}]`) })
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout })
  const choice = await new Promise<string>(resolve => prompt.question('Select app number (Enter to cancel): ', resolve))
  prompt.close()
  if (!choice.trim()) return
  const index = Number(choice)
  if (!Number.isInteger(index) || index < 1 || index > apps.length) throw new Error('Invalid app number')
  const app = apps[index - 1]
  const { command, args: uninstallArgs } = uninstallCommand(app)
  const result = spawnSync(command, uninstallArgs, { stdio: 'inherit' })
  if (result.error || result.status !== 0) throw new Error(`${app.manager} uninstall failed: ${result.error?.message || `exit code ${result.status}`}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) main().catch(error => {
  console.error(`Error: ${error.message}`)
  process.exitCode = 1
})
