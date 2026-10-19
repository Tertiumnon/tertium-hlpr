import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readEntries, visibleRange } from './run.js'

describe('tui run', () => {
  test('lists folders first, then files, by name', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'hlpr-browse-'))
    try {
      writeFileSync(path.join(root, 'b.txt'), '')
      writeFileSync(path.join(root, 'a.txt'), '')
      mkdirSync(path.join(root, 'zeta'))
      expect(readEntries(root)).toEqual([
        { name: 'zeta', isDirectory: true },
        { name: 'a.txt', isDirectory: false },
        { name: 'b.txt', isDirectory: false },
      ])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('keeps the cursor inside the visible window', () => {
    expect(visibleRange(0, 100, 10)).toEqual([0, 10])
    expect(visibleRange(50, 100, 10)).toEqual([45, 55])
    expect(visibleRange(99, 100, 10)).toEqual([90, 100])
    expect(visibleRange(2, 4, 10)).toEqual([0, 4])
  })
})
