import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { version } = JSON.parse(fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'))

test.each([
  { command: 'update', args: ['--help'], latest: '999.0.0', fail: '', status: 0, calls: [] },
  { command: 'upgrade', args: ['--help'], latest: '999.0.0', fail: '', status: 0, calls: [] },
  { command: 'update', args: ['unexpected'], latest: '999.0.0', fail: '', status: 1, calls: [] },
  { command: 'update', args: [], latest: version, fail: '', status: 0, calls: ['view'] },
  { command: 'update', args: [], latest: '0.0.0', fail: '', status: 0, calls: ['view'] },
  { command: 'update', args: [], latest: '999.0.0', fail: '', status: 0, calls: ['view', 'install'] },
  { command: 'upgrade', args: [], latest: '999.0.0', fail: '', status: 0, calls: ['view', 'install'] },
  { command: 'update', args: [], latest: '999.0.0', fail: 'view', status: 1, calls: ['view'] },
  { command: 'update', args: [], latest: '999.0.0', fail: 'install', status: 1, calls: ['view', 'install'] },
])('npm self-update: %j', ({ command, args, latest, fail, status, calls }) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-update-'))
  const log = path.join(tmp, 'npm.log')
  try {
    const windows = process.platform === 'win32'
    fs.writeFileSync(path.join(tmp, windows ? 'npm.cmd' : 'npm'), windows
      ? '@echo off\r\necho %*>>"%HLPR_NPM_LOG%"\r\nif "%1"=="%HLPR_NPM_FAIL%" exit /b 1\r\nif "%1"=="view" echo %HLPR_NPM_VERSION%\r\nexit /b 0\r\n'
      : '#!/bin/sh\nprintf "%s\\n" "$*" >> "$HLPR_NPM_LOG"\n[ "$1" = "$HLPR_NPM_FAIL" ] && exit 1\n[ "$1" = view ] && printf "%s\\n" "$HLPR_NPM_VERSION"\nexit 0\n',
    { mode: 0o755 })
    // Only the fake npm is on PATH, so tests cannot update a real installation.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'path'))
    const result = spawnSync(process.execPath, [path.join(import.meta.dir, '..', command, `${command}.ts`), ...args], {
      cwd: tmp,
      encoding: 'utf8',
      env: { ...env, PATH: tmp, HLPR_NPM_LOG: log, HLPR_NPM_VERSION: latest, HLPR_NPM_FAIL: fail },
    })
    expect(result.status).toBe(status)
    const actual = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split(/\r?\n/) : []
    expect(actual).toEqual(calls.map(call => call === 'view' ? 'view @tertium/hlpr version' : 'install -g @tertium/hlpr@latest'))
    if (args[0] === '--help') expect(result.stdout).toContain('Usage: hlpr update')
    if (fail) {
      expect(result.stderr).toContain('Update failed:')
      expect(result.stdout).not.toContain('✓ hlpr updated')
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})
