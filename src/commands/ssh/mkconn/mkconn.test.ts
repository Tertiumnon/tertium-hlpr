import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { hasHostAlias } from '../../../core/ssh/config.js'
import { remoteAuthorizationCommand, saveConnection } from './mkconn.js'

test('backs up SSH config before adding a connection and refuses duplicate aliases', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'hlpr-ssh-'))
  const config = path.join(dir, 'config')
  const original = 'Host existing\n    HostName old.example\n'
  try {
    await writeFile(config, original)
    const backup = await saveConnection(config, 'new-host', 'alice', '192.0.2.1', path.join(dir, 'key with space'))
    expect(backup).toBeDefined()
    if (!backup) throw new Error('SSH config backup was not created')
    expect(await readFile(backup, 'utf8')).toBe(original)
    const updated = await readFile(config, 'utf8')
    expect(updated).toContain('Host new-host\n    HostName 192.0.2.1\n    User alice\n')
    expect(updated).toContain('IdentityFile "')
    expect(hasHostAlias(updated, 'NEW-HOST')).toBe(true)
    await expect(saveConnection(config, 'existing', 'bob', '192.0.2.2', path.join(dir, 'other'))).rejects.toThrow('already exists')
    expect(await readFile(config, 'utf8')).toBe(updated)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('creates a local backup even when SSH config did not exist', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'hlpr-ssh-'))
  try {
    const config = path.join(dir, 'config')
    const backup = await saveConnection(config, 'new-host', 'alice', '192.0.2.1', path.join(dir, 'key'))
    if (!backup) throw new Error('SSH config backup was not created')
    expect(await readFile(backup, 'utf8')).toBe('')
    expect(await readFile(config, 'utf8')).toContain('Host new-host')
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test.skipIf(process.platform === 'win32')('backs up remote authorized_keys before installing a key', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'hlpr-ssh-'))
  try {
    const sshDir = path.join(dir, '.ssh')
    await mkdir(sshDir)
    await writeFile(path.join(sshDir, 'authorized_keys'), 'existing-key\n')
    const key = 'ssh-ed25519 AAAAtest test@example'
    const run = spawnSync('sh', ['-c', remoteAuthorizationCommand], { env: { ...process.env, HOME: dir }, input: `${key}\n`, encoding: 'utf8' })
    expect(run.status).toBe(0)
    const backup = run.stdout.match(/Remote backup: (.+)/)?.[1]
    expect(backup).toBeDefined()
    if (!backup) throw new Error(run.stderr)
    expect(await readFile(backup, 'utf8')).toBe('existing-key\n')
    expect(await readFile(path.join(sshDir, 'authorized_keys'), 'utf8')).toBe(`existing-key\n${key}\n`)
  } finally { await rm(dir, { recursive: true, force: true }) }
})
