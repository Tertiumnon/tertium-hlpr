import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const script = path.join(import.meta.dir, 'fix.sh')

test.skipIf(process.platform !== 'win32')('refuses to run on Windows', () => {
  const result = spawnSync('bash', [script, '--bun'], { encoding: 'utf8' })
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('Wrong OS')
})

test.skipIf(process.platform === 'win32')('prints usage and rejects anything other than --bun', () => {
  const help = spawnSync('bash', [script, '--help'], { encoding: 'utf8' })
  expect(help.status).toBe(0)
  expect(help.stdout).toContain('Usage: hlpr zsh fix --bun')
  const other = spawnSync('bash', [script, '--node'], { encoding: 'utf8' })
  expect(other.status).toBe(1)
  expect(other.stderr).toContain('Usage: hlpr zsh fix --bun')
})

test.skipIf(process.platform === 'win32')('writes one bun PATH block to .zshrc, backs it up, and replaces it on rerun', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'hlpr-zsh-fix-'))
  try {
    await mkdir(path.join(home, '.bun', 'bin'), { recursive: true })
    await writeFile(path.join(home, '.bun', 'bin', 'bun'), '#!/bin/sh\n')
    await chmod(path.join(home, '.bun', 'bin', 'bun'), 0o755)
    await writeFile(path.join(home, '.zshrc'), 'alias ll="ls -l"\n')
    const env = { ...process.env, HOME: home, ZDOTDIR: '' }
    for (let run = 0; run < 2; run++) {
      const result = spawnSync('bash', [script, '--bun'], { env, encoding: 'utf8' })
      expect(result.status).toBe(0)
    }
    const zshrc = await readFile(path.join(home, '.zshrc'), 'utf8')
    expect(zshrc.startsWith('alias ll="ls -l"\n')).toBe(true)
    expect(zshrc.match(/# >>> hlpr bun >>>/g)).toHaveLength(1)
    expect(zshrc).toContain('export BUN_INSTALL="$HOME/.bun"')
    expect(zshrc).toContain('export PATH="$BUN_INSTALL/bin:$PATH"')
    const backups = (await readdir(home)).filter(name => name.startsWith('.zshrc.bak-'))
    expect(backups).toHaveLength(2)
    const contents = await Promise.all(backups.map(name => readFile(path.join(home, name), 'utf8')))
    expect(contents).toContain('alias ll="ls -l"\n')
    expect(contents).toContain(zshrc)
  } finally { await rm(home, { recursive: true, force: true }) }
})

test.skipIf(process.platform === 'win32')('refuses to run when bun is not installed', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'hlpr-zsh-fix-'))
  try {
    const result = spawnSync('bash', [script, '--bun'], { env: { ...process.env, HOME: home, BUN_INSTALL: '' }, encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('hlpr runtime install bun')
  } finally { await rm(home, { recursive: true, force: true }) }
})
