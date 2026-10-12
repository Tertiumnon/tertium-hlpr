import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { findFiles } from './find.js'

test('finds matching file names recursively from the current directory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-file-find-'))
  try {
    fs.mkdirSync(path.join(root, '.hidden'))
    fs.writeFileSync(path.join(root, 'Report.txt'), '')
    fs.writeFileSync(path.join(root, '.hidden', 'report final.md'), '')
    fs.writeFileSync(path.join(root, '.hidden', 'other.txt'), '')
    expect(findFiles(root, 'REPORT')).toEqual([path.join('.hidden', 'report final.md'), 'Report.txt'])
    expect(findFiles(root, 'missing')).toEqual([])
    const script = path.join(import.meta.dir, 'find.ts')
    const found = spawnSync(process.execPath, [script, '-name', 'report'], { cwd: root, encoding: 'utf8' })
    expect(found.status).toBe(0)
    expect(found.stdout.trim().split(/\r?\n/)).toEqual([path.join('.hidden', 'report final.md'), 'Report.txt'])
    const invalid = spawnSync(process.execPath, [script, '-name'], { cwd: root, encoding: 'utf8' })
    expect(invalid.status).toBe(1)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
