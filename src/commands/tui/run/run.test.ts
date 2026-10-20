import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { deleteEntry, makeDir, readEntries, transfer, visibleRange } from './run.js'

const withTempDir = async (run: (root: string) => Promise<void>): Promise<void> => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hlpr-explorer-'))
  try {
    await run(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const panel = (dir: string, name: string) => ({
  dir,
  entries: readEntries(dir),
  cursor: readEntries(dir).findIndex(entry => entry.name === name),
})

describe('tui run explorer', () => {
  test('lists folders first, then files, by name', () => withTempDir(async (root) => {
    writeFileSync(path.join(root, 'b.txt'), '')
    writeFileSync(path.join(root, 'a.txt'), '')
    mkdirSync(path.join(root, 'zeta'))
    expect(readEntries(root)).toEqual([
      { name: 'zeta', isDirectory: true },
      { name: 'a.txt', isDirectory: false },
      { name: 'b.txt', isDirectory: false },
    ])
  }))

  test('keeps the cursor inside the visible window', () => {
    expect(visibleRange(0, 100, 10)).toEqual([0, 10])
    expect(visibleRange(50, 100, 10)).toEqual([45, 55])
    expect(visibleRange(99, 100, 10)).toEqual([90, 100])
    expect(visibleRange(2, 4, 10)).toEqual([0, 4])
  })

  test('copies a file into the other panel and keeps the source', () => withTempDir(async (root) => {
    const source = path.join(root, 'src')
    const target = path.join(root, 'dst')
    mkdirSync(source)
    mkdirSync(target)
    writeFileSync(path.join(source, 'a.txt'), 'hello')
    await transfer(panel(source, 'a.txt'), panel(target, ''), 'copy')
    expect(readFileSync(path.join(target, 'a.txt'), 'utf8')).toBe('hello')
    expect(existsSync(path.join(source, 'a.txt'))).toBe(true)
  }))

  test('copies a folder with its contents', () => withTempDir(async (root) => {
    const source = path.join(root, 'src')
    const target = path.join(root, 'dst')
    mkdirSync(path.join(source, 'folder', 'deep'), { recursive: true })
    mkdirSync(target)
    writeFileSync(path.join(source, 'folder', 'deep', 'b.txt'), 'deep')
    await transfer(panel(source, 'folder'), panel(target, ''), 'copy')
    expect(readFileSync(path.join(target, 'folder', 'deep', 'b.txt'), 'utf8')).toBe('deep')
  }))

  test('refuses to overwrite an existing target when copying', () => withTempDir(async (root) => {
    const source = path.join(root, 'src')
    const target = path.join(root, 'dst')
    mkdirSync(source)
    mkdirSync(target)
    writeFileSync(path.join(source, 'a.txt'), 'new')
    writeFileSync(path.join(target, 'a.txt'), 'old')
    await expect(transfer(panel(source, 'a.txt'), panel(target, ''), 'copy')).rejects.toThrow()
    expect(readFileSync(path.join(target, 'a.txt'), 'utf8')).toBe('old')
  }))

  test('moves a file and removes the source', () => withTempDir(async (root) => {
    const source = path.join(root, 'src')
    const target = path.join(root, 'dst')
    mkdirSync(source)
    mkdirSync(target)
    writeFileSync(path.join(source, 'a.txt'), 'moved')
    await transfer(panel(source, 'a.txt'), panel(target, ''), 'move')
    expect(readFileSync(path.join(target, 'a.txt'), 'utf8')).toBe('moved')
    expect(existsSync(path.join(source, 'a.txt'))).toBe(false)
  }))

  test('creates a folder and rejects names with slashes or existing names', () => withTempDir(async (root) => {
    expect(await makeDir(root, ' new ')).toBe('Created new')
    expect(existsSync(path.join(root, 'new'))).toBe(true)
    await expect(makeDir(root, 'new')).rejects.toThrow()
    await expect(makeDir(root, 'a/b')).rejects.toThrow('cannot be empty or contain slashes')
  }))

  test('deletes only after an explicit y', () => withTempDir(async (root) => {
    const folder = path.join(root, 'folder')
    mkdirSync(path.join(folder, 'inside'), { recursive: true })
    const entry = { name: 'folder', isDirectory: true }
    expect(await deleteEntry(root, entry, '')).toBe('Delete cancelled')
    expect(existsSync(folder)).toBe(true)
    expect(await deleteEntry(root, entry, 'y')).toBe('Deleted folder')
    expect(existsSync(folder)).toBe(false)
  }))
})
