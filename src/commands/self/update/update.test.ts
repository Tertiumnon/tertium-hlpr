import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { selfFixCommands, selfUpdateInstallCommand } from '../../../core/command/self-update.js'

const { version } = JSON.parse(fs.readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8'))

test('updates Volta-managed packages through Volta', () => {
  const home = path.join(os.tmpdir(), 'volta-home')
  const installed = path.join(home, 'tools', 'image', 'packages', '@tertium', 'hlpr', 'lib', 'node_modules', '@tertium', 'hlpr', 'package.json')
  expect(selfUpdateInstallCommand(installed, home)).toBe('volta install @tertium/hlpr@latest')
  expect(selfUpdateInstallCommand(path.join(os.tmpdir(), 'ordinary', 'package.json'), home)).toBe('npm install -g @tertium/hlpr@latest')
  expect(selfFixCommands(installed, home)).toEqual(['volta uninstall @tertium/hlpr', 'volta install @tertium/hlpr@latest'])
  expect(selfFixCommands(path.join(os.tmpdir(), 'ordinary', 'package.json'), home)).toEqual(['npm install -g --force @tertium/hlpr@latest'])
})

test.each([
  { command: 'update', args: ['--help'], latest: '999.0.0', fail: '', status: 0, calls: [] },
  { command: 'upgrade', args: ['--help'], latest: '999.0.0', fail: '', status: 0, calls: [] },
  { command: 'update', args: ['unexpected'], latest: '999.0.0', fail: '', status: 1, calls: [] },
  { command: 'update', args: [], latest: version, fail: '', status: 0, calls: ['view'] },
  { command: 'update', args: [], latest: '0.0.0', fail: '', status: 0, calls: ['view'] },
  { command: 'update', args: [], latest: '999.0.0', fail: '', status: 0, calls: ['view', 'install'] },
  { command: 'upgrade', args: [], latest: '999.0.0', fail: '', status: 0, calls: ['view', 'install'] },
  { command: 'update', args: [], latest: version, fail: '', broken: true, status: 0, calls: ['view', 'repair'] },
  { command: 'update', args: [], latest: '999.0.0', fail: '', broken: true, status: 0, calls: ['view', 'install', 'repair'] },
  { command: 'update', args: [], latest: version, fail: '', broken: true, repairFails: true, status: 1, calls: ['view', 'repair'] },
  { command: 'update', args: [], latest: '999.0.0', fail: 'view', status: 1, calls: ['view'] },
  { command: 'update', args: [], latest: '999.0.0', fail: 'install', status: 1, calls: ['view', 'install'] },
])('npm self-update: %j', ({ command, args, latest, fail, status, calls, broken, repairFails }) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-update-'))
  const log = path.join(tmp, 'npm.log')
  const fixed = path.join(tmp, 'fixed')
  try {
    const windows = process.platform === 'win32'
    fs.writeFileSync(path.join(tmp, windows ? 'npm.cmd' : 'npm'), windows
      ? '@echo off\r\necho %*>>"%HLPR_NPM_LOG%"\r\nif "%1"=="%HLPR_NPM_FAIL%" exit /b 1\r\nif "%1"=="view" echo %HLPR_NPM_VERSION%\r\nif "%3"=="--force" if "%HLPR_REPAIR_WORKS%"=="1" type nul > "%HLPR_FIXED_FILE%"\r\nexit /b 0\r\n'
      : '#!/bin/sh\nprintf "%s\\n" "$*" >> "$HLPR_NPM_LOG"\n[ "$1" = "$HLPR_NPM_FAIL" ] && exit 1\n[ "$1" = view ] && printf "%s\\n" "$HLPR_NPM_VERSION"\n[ "$3" = --force ] && [ "$HLPR_REPAIR_WORKS" = 1 ] && : > "$HLPR_FIXED_FILE"\nexit 0\n',
    { mode: 0o755 })
    fs.writeFileSync(path.join(tmp, windows ? 'hlpr.cmd' : 'hlpr'), windows
      ? '@echo off\r\nif "%HLPR_BROKEN%"=="1" if not exist "%HLPR_FIXED_FILE%" exit /b 1\r\nif "%1"=="app" echo Usage: hlpr app list\r\nif "%1"=="self" echo Usage: hlpr self update\r\n'
      : '#!/bin/sh\n[ "$HLPR_BROKEN" = 1 ] && [ ! -f "$HLPR_FIXED_FILE" ] && exit 1\n[ "$1" = app ] && echo "Usage: hlpr app list"\n[ "$1" = self ] && echo "Usage: hlpr self update"\nexit 0\n',
    { mode: 0o755 })
    // Only the fake npm is on PATH, so tests cannot update a real installation.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'path'))
    const result = spawnSync(process.execPath, [path.join(import.meta.dir, '..', command, `${command}.ts`), ...args], {
      cwd: tmp,
      encoding: 'utf8',
      env: { ...env, PATH: tmp, HLPR_NPM_LOG: log, HLPR_NPM_VERSION: latest, HLPR_NPM_FAIL: fail, HLPR_BROKEN: broken ? '1' : '0', HLPR_FIXED_FILE: fixed, HLPR_REPAIR_WORKS: repairFails ? '0' : '1' },
    })
    expect(result.status).toBe(status)
    const actual = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split(/\r?\n/) : []
    expect(actual).toEqual(calls.map(call => call === 'view' ? 'view @tertium/hlpr version' : call === 'repair' ? 'install -g --force @tertium/hlpr@latest' : 'install -g @tertium/hlpr@latest'))
    if (args[0] === '--help') expect(result.stdout).toContain('Usage: hlpr self update')
    if (fail) {
      expect(result.stderr).toContain('Update failed:')
      expect(result.stdout).not.toContain('✓ hlpr updated')
    }
    if (repairFails) expect(result.stderr).toContain('hlpr commands still fail after repair')
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})
