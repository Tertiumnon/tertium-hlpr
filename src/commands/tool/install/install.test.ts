import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { dockerInstallCommand, menuFor, moveSelection, parseTool, selectsTool, toolArgs, updateProfile, updatePsReadLineProfile, utilityInstallCommand } from './install.js'

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

  test('rejects extra arguments for every tool before installing', () => {
    const result = spawnSync(process.execPath, [path.join(import.meta.dir, 'install.ts'), 'tldr', 'extra'], { encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('tldr does not accept extra arguments')
  })

  test('menu lists only tools that install on the platform', () => {
    const names = (platform: string) => menuFor(platform).map(([tool]) => tool)
    expect(names('win32')).toEqual(['oh-my-posh', 'starship', 'psreadline', 'pstop', 'docker', 'fastfetch', 'tldr', 'claude-cli', 'codex-cli', 'copilot-cli'])
    expect(names('darwin')).toEqual(['docker', 'oh-my-zsh', 'htop', 'fastfetch', 'tldr', 'claude-cli', 'codex-cli', 'copilot-cli'])
    expect(names('linux')).toEqual(['docker', 'oh-my-zsh', 'htop', 'fastfetch', 'tldr', 'claude-cli', 'codex-cli', 'copilot-cli'])
  })

  test('accepts a tool as a name, -name, or -n', () => {
    expect(toolArgs(['claude-cli'])).toEqual({ value: 'claude-cli', extra: [] })
    expect(toolArgs(['-name', 'codex-cli'])).toEqual({ value: 'codex-cli', extra: [] })
    expect(toolArgs(['-n', 'copilot-cli'])).toEqual({ value: 'copilot-cli', extra: [] })
    expect(toolArgs([])).toEqual({ value: undefined, extra: [] })
    expect(() => toolArgs(['-name'])).toThrow('Missing tool name')
    expect(() => toolArgs(['--claude-cli'])).toThrow('Unknown option: --claude-cli')
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
    expect(parseTool('Docker')).toBe('docker')
    expect(parseTool('oh-my-zsh')).toBe('oh-my-zsh')
    expect(parseTool('node')).toBeUndefined()
    expect(parseTool('TLDR')).toBe('tldr')
    expect(parseTool('Claude-CLI')).toBe('claude-cli')
    expect(parseTool('constructor')).toBeUndefined()
    expect(parseTool('HTOP')).toBe('htop')
    expect(parseTool('Fastfetch')).toBe('fastfetch')
  })

  test('installs htop and fastfetch with the selected native package manager', () => {
    expect(utilityInstallCommand('fastfetch', 'winget')).toEqual({ command: 'winget', args: ['install', '--id', 'Fastfetch-cli.Fastfetch', '--exact'] })
    expect(utilityInstallCommand('fastfetch', 'scoop')).toEqual({ command: 'cmd.exe', args: ['/d', '/c', 'scoop', 'install', 'fastfetch'] })
    expect(utilityInstallCommand('htop', 'brew')).toEqual({ command: 'brew', args: ['install', 'htop'] })
    expect(utilityInstallCommand('htop', 'apt-get')).toEqual({ command: 'sudo', args: ['apt-get', 'install', 'htop'] })
    expect(utilityInstallCommand('fastfetch', 'dnf')).toEqual({ command: 'sudo', args: ['dnf', 'install', 'fastfetch'] })
    expect(utilityInstallCommand('htop', 'pacman')).toEqual({ command: 'sudo', args: ['pacman', '-S', 'htop'] })
    expect(() => utilityInstallCommand('htop', 'winget')).toThrow('macOS and Linux')
  })

  test('installs Docker Desktop or the Linux engine package', () => {
    expect(dockerInstallCommand('winget')).toEqual({ command: 'winget', args: ['install', '--id', 'Docker.DockerDesktop', '--exact'] })
    expect(dockerInstallCommand('brew')).toEqual({ command: 'brew', args: ['install', '--cask', 'docker'] })
    expect(dockerInstallCommand('apt-get')).toEqual({ command: 'sudo', args: ['apt-get', 'install', 'docker.io'] })
    expect(dockerInstallCommand('dnf')).toEqual({ command: 'sudo', args: ['dnf', 'install', 'moby-engine', 'docker-cli'] })
    expect(dockerInstallCommand('pacman')).toEqual({ command: 'sudo', args: ['pacman', '-S', 'docker'] })
    expect(() => dockerInstallCommand('scoop')).toThrow('not supported')
  })
})
