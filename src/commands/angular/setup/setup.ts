#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { setupGitHooks } from '../../../core/git/hooks.js'
import { ensureScripts } from '../../../core/npm/scripts.js'

// @description Set up an Angular project: bun, biome lint/fmt, @tertium/js, git hooks, changelog

interface PackageJson {
  packageManager?: string
  scripts?: Record<string, string>
  [key: string]: unknown
}

function query(cwd: string, command: string, args: string[]): string {
  return execFileSync(command, args, { cwd, encoding: 'utf8' }).trim()
}

function run(cwd: string, command: string, args: string[]): void {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`)
}

function readPackageJson(cwd: string): PackageJson {
  return JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8'))
}

function writePackageJson(cwd: string, pkg: PackageJson): void {
  writeFileSync(path.join(cwd, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)
}

function setScripts(cwd: string, scripts: Record<string, string>): void {
  const pkg = readPackageJson(cwd)
  writePackageJson(cwd, { ...pkg, scripts: { ...pkg.scripts, ...scripts } })
}

// Commits everything the step changed. A step that changed nothing makes no commit.
function commitIfChanged(cwd: string, message: string): void {
  if (!query(cwd, 'git', ['status', '--porcelain'])) return
  run(cwd, 'git', ['add', '--all'])
  run(cwd, 'git', ['commit', '-m', message])
}

function checkoutDevelop(cwd: string): void {
  if (query(cwd, 'git', ['status', '--porcelain'])) {
    throw new Error('Uncommitted changes found. Commit or stash them, then run hlpr angular setup again.')
  }
  run(cwd, 'git', ['checkout', 'develop'])
}

function pinBunVersion(cwd: string): void {
  const pkg = readPackageJson(cwd)
  writePackageJson(cwd, { ...pkg, packageManager: `bun@${query(cwd, 'bun', ['--version'])}` })
}

function migrateFromNpm(cwd: string): void {
  const lockfile = path.join(cwd, 'package-lock.json')
  if (!existsSync(lockfile)) return
  rmSync(lockfile)
  run(cwd, 'bun', ['install'])
}

// Same formatter settings as @tertium/js: biome's own init would pick tabs.
const BIOME_CONFIG = { formatter: { enabled: true, indentStyle: 'space', indentWidth: 2 }, linter: { enabled: true } }

function setupBiome(cwd: string): void {
  run(cwd, 'bun', ['add', '-d', '@biomejs/biome'])
  const configPath = path.join(cwd, 'biome.json')
  if (!existsSync(configPath)) writeFileSync(configPath, `${JSON.stringify(BIOME_CONFIG, null, 2)}\n`)
  setScripts(cwd, { fmt: 'biome format --write .', lint: 'biome check --write .' })
}

// The pre-commit hook runs "typecheck" on TypeScript projects, so it must exist before the hook is written.
// Universal (SSR) projects keep server code in tsconfig.server.json, so every Angular config that exists is checked.
function setupTypecheck(cwd: string): void {
  const configs = ['tsconfig.app.json', 'tsconfig.server.json'].filter(file => existsSync(path.join(cwd, file)))
  const command = configs.length ? configs.map(file => `tsc -p ${file} --noEmit`).join(' && ') : 'tsc --noEmit'
  setScripts(cwd, { typecheck: command })
}

function setupChangelog(cwd: string): void {
  setScripts(cwd, { version: 'bun node_modules/@tertium/js/scripts/changelog/changelog.ts && git add CHANGELOG.md' })
}

export function setupAngular(cwd: string): void {
  if (!existsSync(path.join(cwd, '.git'))) throw new Error(`Not a git repository (no .git found): ${cwd}`)

  checkoutDevelop(cwd)
  pinBunVersion(cwd)
  migrateFromNpm(cwd)
  commitIfChanged(cwd, 'chore: use bun as package manager')

  ensureScripts(cwd)
  commitIfChanged(cwd, 'chore: add dev npm script')

  setupBiome(cwd)
  commitIfChanged(cwd, 'chore: set up biome lint and fmt')

  run(cwd, 'bun', ['add', '-d', '@tertium/js'])
  commitIfChanged(cwd, 'chore: add @tertium/js')

  setupTypecheck(cwd)
  setupGitHooks(cwd)
  commitIfChanged(cwd, 'chore: add git pre-commit hook')

  setupChangelog(cwd)
  commitIfChanged(cwd, 'chore: generate changelog on version bump')
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log('Usage: hlpr angular setup [projectPath]\nSets up an Angular project with bun, biome, @tertium/js, a pre-commit hook and changelog. Each step is committed.\nRequires a clean git working tree; checks out develop first.')
  } else {
    try {
      setupAngular(args[0] ?? process.cwd())
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`)
      process.exitCode = 1
    }
  }
}
