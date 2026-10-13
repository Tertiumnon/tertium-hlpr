#!/usr/bin/env node
import { ensureScripts } from '../../../core/npm/scripts.js'

// @description Add missing start and dev npm scripts for the detected framework

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log('Usage: hlpr npm scripts [projectPath] [--force]\nAdds missing "start" and "dev" scripts based on the framework in package.json.\nOptions: --force overwrites existing "start" and "dev" scripts.')
  } else {
    try {
      ensureScripts(args.find(arg => !arg.startsWith('-')) ?? process.cwd(), { force: args.includes('--force') })
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`)
      process.exitCode = 1
    }
  }
}
