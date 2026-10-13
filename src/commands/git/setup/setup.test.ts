import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildPreCommitHook, setupGitHooks } from '../../../core/git/hooks.js'
import { parseSetupArgs } from './setup.js'

describe('git setup -hooks', () => {
  test('requires -hooks, takes no project path, and accepts --force', () => {
    expect(parseSetupArgs(['-hooks'])).toEqual({ force: false })
    expect(parseSetupArgs(['-hooks', '--force'])).toEqual({ force: true })
    expect(() => parseSetupArgs([])).toThrow('Usage: hlpr git setup -hooks')
    expect(() => parseSetupArgs(['-hooks', './app'])).toThrow('Unknown option ./app')
    expect(() => parseSetupArgs(['-hooks', '-force'])).toThrow('Unknown option -force')
  })

  test('TypeScript projects always check lint and typecheck, test only when defined', () => {
    const hook = buildPreCommitHook({ scripts: {} }, 'bun', true)
    expect(hook).toContain('bun run lint')
    expect(hook).toContain('bun run typecheck')
    expect(hook).not.toContain('bun run test')
  })

  test('writes the hook, points core.hooksPath at it, and adds prepare', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-git-hooks-'))
    try {
      spawnSync('git', ['init', '-b', 'main'], { cwd: dir })
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'bun test' } }))
      fs.writeFileSync(path.join(dir, 'bun.lock'), '')

      setupGitHooks(dir)

      expect(fs.readFileSync(path.join(dir, '.githooks', 'pre-commit'), 'utf8')).toContain('bun run test')
      expect(spawnSync('git', ['config', 'core.hooksPath'], { cwd: dir, encoding: 'utf8' }).stdout.trim()).toBe('.githooks')
      expect(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).scripts.prepare).toBe('git config core.hooksPath .githooks')
      expect(() => setupGitHooks(dir)).toThrow('already exists')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
