#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

// @description Rename a GitHub repository with gh: -repo <owner/repo> -to <new name>

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr gh rename -repo <owner/repo> -to <new repo name>'

export function parseRenameArgs(args: string[]): { repo: string; to: string } {
  const repoIndex = args.indexOf('-repo')
  const toIndex = args.indexOf('-to')
  const repo = repoIndex === -1 ? undefined : args[repoIndex + 1]
  const to = toIndex === -1 ? undefined : args[toIndex + 1]
  const unknown = args.find((arg, index) => arg.startsWith('-') && index !== repoIndex && index !== toIndex)
  if (unknown) throw new Error(`Unknown option ${unknown}. ${USAGE}`)
  if (!repo || !to) throw new Error(USAGE)
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) throw new Error(`-repo must be OWNER/REPO, got "${repo}". ${USAGE}`)
  if (/[/\s]/.test(to)) throw new Error(`-to must be the new name without an owner, got "${to}". ${USAGE}`)
  return { repo, to }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nRenames the repository with gh repo rename. gh asks for confirmation before renaming; in a non-interactive shell it refuses to run.\nRequires the GitHub CLI (gh), logged in with rights to the repository.`)
    return
  }
  const { repo, to } = parseRenameArgs(args)
  const result = spawnSync('gh', ['repo', 'rename', to, '--repo', repo], { stdio: 'inherit' })
  if (result.error) throw new Error(`Could not run gh: ${result.error.message}. Install the GitHub CLI from https://cli.github.com`)
  if (result.status !== 0) throw new Error(`gh repo rename failed with exit code ${result.status}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
