#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { repairInstallation } from '../../../core/command/self-update.js'

// @description Reinstall hlpr when command files are missing

const args = process.argv.slice(2)
if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
  console.log('Usage: hlpr self fix')
  console.log('Reinstall the latest hlpr through Volta or npm, even if this version is already installed.')
} else if (args.length) {
  console.error('Usage: hlpr self fix')
  process.exitCode = 1
} else {
  try {
    const packagePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'package.json')
    repairInstallation(packagePath)
    console.log('hlpr reinstalled. Run hlpr help to check the available commands.')
  } catch (error) {
    console.error(`Repair failed: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  }
}
