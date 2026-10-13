import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setupAngular } from './setup.js'

describe('angular setup', () => {
  test('refuses to run on a repository with uncommitted changes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-angular-'))
    try {
      spawnSync('git', ['init', '-b', 'main'], { cwd: dir })
      fs.writeFileSync(path.join(dir, 'package.json'), '{}')

      expect(() => setupAngular(dir)).toThrow('Uncommitted changes')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('refuses to run outside a git repository', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-angular-'))
    try {
      expect(() => setupAngular(dir)).toThrow('Not a git repository')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
