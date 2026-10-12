import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function run(cwd: string, script: string, args: string[] = []) {
  return spawnSync('bash', ['-s', '--', ...args], {
    cwd,
    encoding: 'utf8',
    input: fs.readFileSync(new URL(script, import.meta.url), 'utf8'),
  })
}

describe('git commands', () => {
  test('create, switch, remove, and clean a repository', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-git-'))
    const repo = path.join(tmp, 'repo')
    const remote = path.join(tmp, 'remote.git')
    try {
      fs.mkdirSync(repo)
      expect(spawnSync('git', ['init', '-b', 'main'], { cwd: repo }).status).toBe(0)
      expect(spawnSync('git', ['init', '--bare', remote]).status).toBe(0)
      spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repo })
      spawnSync('git', ['config', 'user.name', 'Test'], { cwd: repo })
      fs.writeFileSync(path.join(repo, 'tracked.txt'), 'tracked')
      spawnSync('git', ['add', '.'], { cwd: repo })
      expect(spawnSync('git', ['commit', '-m', 'initial'], { cwd: repo }).status).toBe(0)
      spawnSync('git', ['remote', 'add', 'origin', '../remote.git'], { cwd: repo })
      expect(spawnSync('git', ['push', '-u', 'origin', 'main'], { cwd: repo }).status).toBe(0)

      expect(run(repo, 'create.sh', ['-b', 'feature']).status).toBe(0)
      expect(spawnSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).stdout.trim()).toBe('main')
      expect(run(repo, 'switch.sh', ['-branch', 'feature']).status).toBe(0)
      expect(run(repo, 'switch.sh', ['-branch', 'main']).status).toBe(0)
      expect(spawnSync('git', ['push', 'origin', 'feature'], { cwd: repo }).status).toBe(0)
      expect(run(repo, 'remove.sh', ['feature', '-remote']).status).toBe(0)
      expect(spawnSync('git', ['branch', '--list', 'feature'], { cwd: repo, encoding: 'utf8' }).stdout).toContain('feature')
      expect(spawnSync('git', ['push', 'origin', 'feature'], { cwd: repo }).status).toBe(0)
      expect(run(repo, 'sync.sh').status).toBe(0)
      expect(run(repo, 'remove.sh', ['feature', '-both']).status).toBe(0)
      expect(spawnSync('git', ['branch', '--list', 'feature'], { cwd: repo, encoding: 'utf8' }).stdout.trim()).toBe('')
      expect(spawnSync('git', ['ls-remote', '--heads', 'origin', 'feature'], { cwd: repo, encoding: 'utf8' }).stdout.trim()).toBe('')

      expect(run(repo, 'create.sh', ['-branch', 'local-only']).status).toBe(0)
      expect(run(repo, 'remove.sh', ['-b', 'local-only']).status).toBe(0)

      fs.mkdirSync(path.join(repo, 'untracked-dir'))
      fs.writeFileSync(path.join(repo, 'untracked.txt'), 'x')
      fs.writeFileSync(path.join(repo, 'untracked-dir', 'file.txt'), 'x')
      expect(run(repo, 'clean.sh').status).toBe(0)
      expect(fs.existsSync(path.join(repo, 'untracked.txt'))).toBe(false)
      expect(fs.existsSync(path.join(repo, 'untracked-dir'))).toBe(false)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  }, 30_000)
})
