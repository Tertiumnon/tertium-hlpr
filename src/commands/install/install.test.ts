import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { moveSelection, parseTool, parseVersion, runtimeInstallCommands, selectsTool, updateProfile, updatePsReadLineProfile } from './install.js'

describe('install', () => {
  test('recognizes an existing oh-my-zsh installation without running the installer', () => {
    const zshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-oh-my-zsh-'))
    try {
      fs.writeFileSync(path.join(zshDir, 'oh-my-zsh.sh'), '')
      const result = spawnSync(process.execPath, [path.join(import.meta.dir, 'install.ts'), 'oh-my-zsh'], {
        encoding: 'utf8', env: { ...process.env, ZSH: zshDir },
      })
      expect(result.status).toBe(0)
      expect(result.stdout).toContain('already installed')
    } finally {
      fs.rmSync(zshDir, { recursive: true, force: true })
    }
  })

  test('arrow selection wraps at both ends', () => {
    expect(moveSelection(0, 'up', 9)).toBe(8)
    expect(moveSelection(8, 'down', 9)).toBe(0)
    expect(moveSelection(3, 'down', 9)).toBe(4)
  })

  test('selects with Enter or Space, not horizontal arrows', () => {
    expect(selectsTool('', 'return')).toBe(true)
    expect(selectsTool(' ', 'space')).toBe(true)
    expect(selectsTool('', 'left')).toBe(false)
    expect(selectsTool('', 'right')).toBe(false)
  })

  test('adds PSReadLine completion and history predictions once', () => {
    const configured = updatePsReadLineProfile('$env:EDITOR = "code"\n')
    expect(configured).toBe('$env:EDITOR = "code"\nSet-PSReadLineKeyHandler -Key Tab -Function MenuComplete\nif ($Host.UI.SupportsVirtualTerminal -and -not [Console]::IsOutputRedirected) {\n    Set-PSReadLineOption -PredictionSource History\n    Set-PSReadLineOption -PredictionViewStyle ListView\n}\n')
    expect(updatePsReadLineProfile(configured)).toBe(configured)
    expect(updatePsReadLineProfile('Set-PSReadLineOption -PredictionSource History\n')).toContain('    Set-PSReadLineOption -PredictionViewStyle ListView\n')
  })
  test('switches prompt initialization without changing other profile lines', () => {
    const profile = '$env:EDITOR = "code"\nInvoke-Expression (&starship init powershell)\n'
    expect(updateProfile(profile, 'oh-my-posh')).toBe('$env:EDITOR = "code"\noh-my-posh init pwsh | Invoke-Expression\n')
  })

  test('recognizes additional tool names', () => {
    expect(parseTool('PSReadLine')).toBe('psreadline')
    expect(parseTool('pstop')).toBe('pstop')
    expect(parseTool('nvm')).toBe('nvm')
    expect(parseTool('oh-my-zsh')).toBe('oh-my-zsh')
    expect(parseTool('node')).toBe('node')
    expect(parseTool('python')).toBe('python')
    expect(parseTool('bun')).toBe('bun')
    expect(parseTool('TLDR')).toBe('tldr')
  })

  test('parses a major version flag', () => {
    expect(parseVersion([])).toBeUndefined()
    expect(parseVersion(['-v', '24'])).toBe('24')
    expect(parseVersion(['-version', '24'])).toBe('24')
    expect(() => parseVersion(['--version', '24'])).toThrow()
  })

  test('uses the platform package manager and requested version', () => {
    expect(runtimeInstallCommands('node', 'win32', '24')[0]).toEqual({
      command: 'winget',
      args: ['install', '--id', 'OpenJS.NodeJS.LTS', '--exact'],
    })
    expect(runtimeInstallCommands('node', 'darwin')[0]).toEqual({ command: 'brew', args: ['install', 'node@24'] })
    expect(runtimeInstallCommands('node', 'linux')[0].args[1]).toContain('setup_lts.x')
    expect(runtimeInstallCommands('python', 'linux', '3')[1].args).toContain('python3')
    expect(runtimeInstallCommands('bun', 'darwin', '1')[0]).toEqual({ command: 'brew', args: ['tap', 'oven-sh/bun'] })
  })

  test('rejects unavailable runtime majors', () => {
    expect(() => runtimeInstallCommands('node', 'win32', '22')).toThrow('Node 24')
    expect(() => runtimeInstallCommands('python', 'linux', '2')).toThrow('major version 3')
    expect(() => runtimeInstallCommands('bun', 'win32', '2')).toThrow('major version 1')
  })
})
