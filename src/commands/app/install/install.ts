#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { appChoices, appLabel, installCommand, matchingApps, remoteApps } from '../../../core/command/apps.js'
import { selectFromMenu } from '../../../core/command/menu.js'

// @description Find an app by name in package managers and install the one you select

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length === 1 && ['-h', '--help'].includes(args[0])) {
    console.log('Usage: hlpr app install -name <app name>')
    console.log('Search package managers for the name, then choose a package from a keyboard menu to install.')
    console.log('Scoop searches configured buckets only; add extras with: scoop bucket add extras')
    console.log('Homebrew distinguishes formulae and casks. Flatpak may ask you to choose a configured remote.')
    return
  }
  if (args.length < 2 || args[0] !== '-name' || args.slice(1).some(value => !value.trim())) throw new Error('Usage: hlpr app install -name <app name>')
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Select an app in an interactive terminal')

  const name = args.slice(1).join(' ')
  const choices = appChoices(matchingApps(remoteApps(process.platform, name), name))
  if (!choices.length) { console.log(`No packages found matching "${name}".`); return }

  const index = await selectFromMenu(choices.map(appLabel))
  if (index === undefined) return
  const app = choices[index]
  const { command, args: installArgs } = installCommand(app)
  const result = spawnSync(command, installArgs, { stdio: 'inherit' })
  if (result.error || result.status !== 0) throw new Error(`${app.manager} install failed: ${result.error?.message || `exit code ${result.status}`}`)
  console.log(`Installed ${app.name}.`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) main().catch(error => {
  console.error(`Error: ${error.message}`)
  process.exitCode = 1
})
