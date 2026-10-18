#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { appChoices, appLabel, installedApps, uninstallCommand } from '../../../core/command/apps.js'
import { selectFromMenu } from '../../../core/command/menu.js'

export { parsePackages, uninstallCommand } from '../../../core/command/apps.js'

// @description Find and uninstall an app from an available package manager

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length === 1 && ['-h', '--help'].includes(args[0])) {
    console.log('Usage: hlpr app remove -name <app name>\nAliases: hlpr app delete, hlpr app uninstall\nChoose an installed app from a keyboard menu to uninstall it.')
    return
  }
  if (args.length < 2 || args[0] !== '-name' || args.slice(1).some(value => !value.trim())) throw new Error('Usage: hlpr app remove -name <app name>')
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Select an app in an interactive terminal')

  const name = args.slice(1).join(' ')
  const search = name.toLowerCase()
  const choices = appChoices(installedApps(process.platform).filter(app => `${app.name} ${app.id}`.toLowerCase().includes(search)))
  if (!choices.length) { console.log(`No installed apps found matching "${name}".`); return }

  const index = await selectFromMenu(choices.map(appLabel))
  if (index === undefined) return
  const app = choices[index]
  const { command, args: uninstallArgs } = uninstallCommand(app)
  const result = spawnSync(command, uninstallArgs, { stdio: 'inherit' })
  if (result.error || result.status !== 0) throw new Error(`${app.manager} uninstall failed: ${result.error?.message || `exit code ${result.status}`}`)
  console.log(`Uninstalled ${app.name}.`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) main().catch(error => {
  console.error(`Error: ${error.message}`)
  process.exitCode = 1
})
