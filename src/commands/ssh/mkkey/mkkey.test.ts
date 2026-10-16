import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { keyPathFor } from '../../../core/ssh/key.js'

test('names keys {host}-{user} under ~/.ssh, the same for mkcon and mkkey', () => {
  expect(keyPathFor('192.0.2.1', 'alice')).toBe(path.join(os.homedir(), '.ssh', '192.0.2.1-alice'))
})

test('prints usage and rejects arguments', () => {
  const help = spawnSync(process.execPath, [path.join(import.meta.dir, 'mkkey.ts'), '--help'], { encoding: 'utf8' })
  expect(help.status).toBe(0)
  expect(help.stdout).toContain('Usage: hlpr ssh mkkey')
  const extra = spawnSync(process.execPath, [path.join(import.meta.dir, 'mkkey.ts'), 'extra'], { encoding: 'utf8' })
  expect(extra.status).toBe(1)
  expect(extra.stderr).toContain('Usage: hlpr ssh mkkey')
})
