import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { chmod, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const script = path.join(import.meta.dir, 'fix.sh')
const mode = async (file: string) => ((await stat(file)).mode & 0o777).toString(8)

test('prints usage and rejects anything other than --permissions', () => {
  const help = spawnSync('bash', [script, '--help'], { encoding: 'utf8' })
  expect(help.status).toBe(0)
  expect(help.stdout).toContain('Usage: hlpr ssh fix --permissions')
  const bare = spawnSync('bash', [script], { encoding: 'utf8' })
  expect(bare.status).toBe(1)
  expect(bare.stderr).toContain('Usage: hlpr ssh fix --permissions')
})

test.skipIf(process.platform === 'win32')('sets ~/.ssh and each file to its required mode', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'hlpr-ssh-fix-'))
  try {
    const sshDir = path.join(home, '.ssh')
    const files = { 'id_ed25519': 0o644, 'id_ed25519.pub': 0o600, 'config': 0o600, 'known_hosts': 0o600, 'authorized_keys': 0o644 }
    await mkdir(sshDir)
    await chmod(sshDir, 0o755)
    for (const [name, value] of Object.entries(files)) {
      await writeFile(path.join(sshDir, name), '')
      await chmod(path.join(sshDir, name), value)
    }
    const run = spawnSync('bash', [script, '--permissions'], { env: { ...process.env, HOME: home }, encoding: 'utf8' })
    expect(run.status).toBe(0)
    expect(await mode(sshDir)).toBe('700')
    expect(await mode(path.join(sshDir, 'id_ed25519'))).toBe('600')
    expect(await mode(path.join(sshDir, 'id_ed25519.pub'))).toBe('644')
    expect(await mode(path.join(sshDir, 'config'))).toBe('644')
    expect(await mode(path.join(sshDir, 'known_hosts'))).toBe('644')
    expect(await mode(path.join(sshDir, 'authorized_keys'))).toBe('600')
  } finally { await rm(home, { recursive: true, force: true }) }
})
