import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
  expect(help.stdout).toContain('[--rsa]')
  const extra = spawnSync(process.execPath, [path.join(import.meta.dir, 'mkkey.ts'), 'extra'], { encoding: 'utf8' })
  expect(extra.status).toBe(1)
  expect(extra.stderr).toContain('Usage: hlpr ssh mkkey')
})

test('RSA flag reuses a matching key and saves its connection', () => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'hlpr-mkkey-'))
  try {
    const ssh = path.join(home, '.ssh')
    mkdirSync(ssh)
    writeFileSync(path.join(ssh, 'example.com-alice'), 'private fixture')
    writeFileSync(path.join(ssh, 'example.com-alice.pub'), 'ssh-rsa fixture alice@example.com\n')
    const result = spawnSync(process.execPath, [path.join(import.meta.dir, 'mkkey.ts'), '--rsa'], {
      encoding: 'utf8', input: 'alice\nexample.com\nexample\n', env: { ...process.env, HOME: home, USERPROFILE: home },
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('ssh-rsa fixture alice@example.com')
    expect(readFileSync(path.join(ssh, 'config'), 'utf8')).toContain('Host example')
    expect(readFileSync(path.join(ssh, 'example.com-alice'), 'utf8')).toBe('private fixture')
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('RSA flag rejects an existing Ed25519 key without overwriting it', () => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'hlpr-mkkey-'))
  try {
    const ssh = path.join(home, '.ssh')
    mkdirSync(ssh)
    writeFileSync(path.join(ssh, 'example.com-alice'), 'private fixture')
    writeFileSync(path.join(ssh, 'example.com-alice.pub'), 'ssh-ed25519 fixture\n')
    const result = spawnSync(process.execPath, [path.join(import.meta.dir, 'mkkey.ts'), '--rsa'], {
      encoding: 'utf8', input: 'alice\nexample.com\nexample\n', env: { ...process.env, HOME: home, USERPROFILE: home },
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('non-rsa public key')
    expect(readFileSync(path.join(ssh, 'example.com-alice'), 'utf8')).toBe('private fixture')
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
