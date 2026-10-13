#!/usr/bin/env node
import { setupGitHooks } from '../../../core/git/hooks.js'

// @description Set up git in the current repository: -hooks writes a shared pre-commit hook

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr git setup -hooks [--force]'

export function parseSetupArgs(args: string[]): { force: boolean } {
  if (!args.includes('-hooks')) throw new Error(USAGE)
  const unknown = args.find(arg => arg !== '-hooks' && arg !== '--force')
  if (unknown) throw new Error(`Unknown option ${unknown}. ${USAGE}`)
  return { force: args.includes('--force') }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\n-hooks writes .githooks/pre-commit in the current directory and sets core.hooksPath, so the hook is shared with every clone.\nOptions: --force overwrites an existing hook.`)
    return
  }
  const { force } = parseSetupArgs(args)
  setupGitHooks(process.cwd(), { force })
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
