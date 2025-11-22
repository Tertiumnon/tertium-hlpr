import { describe, expect, test } from 'bun:test'
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

const tmpDir = path.join(process.cwd(), 'tmp', 'rename-e2e')

function resetDir() {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
  fs.mkdirSync(tmpDir, { recursive: true })
}

function createTestFiles() {
  const nestedDir = path.join(tmpDir, 'Nested Dir')
  const deepDir = path.join(nestedDir, 'Deep Directory')
  fs.mkdirSync(deepDir, { recursive: true })
  fs.writeFileSync(path.join(tmpDir, 'File One.txt'), 'x')
  fs.writeFileSync(path.join(tmpDir, 'another-file.TXT'), 'y')
  // Use a non-test suffix to avoid the test runner picking it up
  fs.writeFileSync(path.join(nestedDir, 'Deep File.testdata.js'), 'z')
  fs.writeFileSync(path.join(deepDir, 'Inner File.md'), 'a')
}

describe('rename e2e', () => {
  test('rename cli transforms folder structure', () => {
    resetDir()
    createTestFiles()

    // Build first
    const build = spawnSync('bun', ['run', 'build'], { stdio: 'inherit' })
    expect(build.status).toBe(0)

    // dry run
    const dry = spawnSync('node', ['bin/index.js', 'file', 'rename', tmpDir, 'kebab', '--dry'], { encoding: 'utf8' })
    expect(dry.stdout).toContain('Dry run - would rename')

    // files not changed
    expect(fs.existsSync(path.join(tmpDir, 'File One.txt'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'Nested Dir', 'Deep File.testdata.js'))).toBe(true)

    // Apply
    const actual = spawnSync('node', ['bin/index.js', 'file', 'rename', tmpDir, 'kebab'], { encoding: 'utf8' })
    expect(actual.stdout).toContain('Renamed')

    // Validate
    expect(fs.existsSync(path.join(tmpDir, 'file-one.txt'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'nested-dir'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'nested-dir', 'deep-file.testdata.js'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'nested-dir', 'deep-directory', 'inner-file.md'))).toBe(true)
  })
})
