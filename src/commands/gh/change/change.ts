#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { parseFlags } from '../../../core/args.js'

// @description Rename the default branch of the current GitHub repository with gh: --default-branch=<name> --to=<new name>

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr gh change --default-branch=<name> --to=<new name>'

export function parseChangeArgs(args: string[]): { defaultBranch: string; to: string } {
  let values: Record<string, string | true>
  try { values = parseFlags(args, ['-default-branch', '-to']) }
  catch (error) { throw new Error(`${error instanceof Error ? error.message : error}\n${USAGE}`) }
  const defaultBranch = values['-default-branch']
  const to = values['-to']
  if (typeof defaultBranch !== 'string' || typeof to !== 'string') throw new Error(USAGE)
  if (/\s/.test(defaultBranch) || /\s/.test(to)) throw new Error(`Branch names cannot contain spaces. ${USAGE}`)
  if (defaultBranch.startsWith('-') || to.startsWith('-')) throw new Error(`Branch names cannot start with a dash. ${USAGE}`)
  if (defaultBranch === to) throw new Error(`--to must differ from --default-branch. ${USAGE}`)
  return { defaultBranch, to }
}

function gh(args: string[]): string {
  const result = spawnSync('gh', args, { encoding: 'utf8' })
  if (result.error) throw new Error(`Could not run gh: ${result.error.message}. Install the GitHub CLI from https://cli.github.com`)
  if (result.status !== 0) throw new Error(`gh ${args[0]} ${args[1]} failed: ${result.stderr.trim() || `exit code ${result.status}`}`)
  return result.stdout
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nRenames the default branch of the repository in the current directory and GitHub switches the default to the new name.\nRefuses to run unless the repository's current default branch is --default-branch.\nRequires the GitHub CLI (gh), logged in with push rights to the repository.`)
    return
  }
  const { defaultBranch, to } = parseChangeArgs(args)
  const repo = JSON.parse(gh(['repo', 'view', '--json', 'nameWithOwner,defaultBranchRef']))
  const current: string = repo.defaultBranchRef.name
  if (current !== defaultBranch) throw new Error(`The default branch of ${repo.nameWithOwner} is "${current}", not "${defaultBranch}".`)
  gh(['api', '-X', 'POST', `repos/${repo.nameWithOwner}/branches/${encodeURIComponent(defaultBranch)}/rename`, '-f', `new_name=${to}`])
  console.log(`Renamed ${repo.nameWithOwner} default branch: ${defaultBranch} -> ${to}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
