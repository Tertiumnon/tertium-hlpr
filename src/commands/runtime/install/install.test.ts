import { expect, test } from 'bun:test'
import { moveSelection, parseRuntime, parseVersion, runtimeInstallCommands, selectsRuntime } from './install.js'

test('recognizes runtimes and selects from the menu', () => {
  for (const runtime of ['node', 'python', 'bun', 'rust', 'go'] as const) expect(parseRuntime(runtime.toUpperCase())).toBe(runtime)
  expect(parseRuntime('docker')).toBeUndefined()
  expect(moveSelection(0, 'up', 5)).toBe(4)
  expect(selectsRuntime('', 'return')).toBe(true)
})

test('keeps major version handling for Node, Python, and Bun', () => {
  expect(parseVersion(['-v', '24'])).toBe('24')
  expect(parseVersion(['-version', '24'])).toBe('24')
  expect(() => parseVersion(['--version', '24'])).toThrow()
  expect(runtimeInstallCommands('node', 'win32', '24')[0].args).toContain('OpenJS.NodeJS.LTS')
  expect(runtimeInstallCommands('node', 'darwin')[0].args).toContain('node@24')
  expect(runtimeInstallCommands('node', 'linux', undefined, 'apt-get')[0].args[1]).toContain('setup_lts.x')
  expect(runtimeInstallCommands('python', 'linux', '3', 'apt-get')[1].args).toContain('python3')
  expect(runtimeInstallCommands('bun', 'darwin', '1')[0].args).toContain('oven-sh/bun')
  expect(() => runtimeInstallCommands('node', 'win32', '22')).toThrow('Node 24')
  expect(() => runtimeInstallCommands('python', 'linux', '2')).toThrow('major version 3')
  expect(() => runtimeInstallCommands('bun', 'win32', '2')).toThrow('major version 1')
})

test('uses native packages for Rust and Go on each platform', () => {
  expect(runtimeInstallCommands('rust', 'win32')[0].args).toContain('Rustlang.Rustup')
  expect(runtimeInstallCommands('go', 'win32')[0].args).toContain('GoLang.Go')
  expect(runtimeInstallCommands('rust', 'darwin')[0]).toEqual({ command: 'brew', args: ['install', 'rust'] })
  expect(runtimeInstallCommands('go', 'darwin')[0]).toEqual({ command: 'brew', args: ['install', 'go'] })
  expect(runtimeInstallCommands('rust', 'linux', undefined, 'apt-get')[0].args).toEqual(['apt-get', 'install', 'rustc', 'cargo'])
  expect(runtimeInstallCommands('go', 'linux', undefined, 'apt-get')[0].args).toEqual(['apt-get', 'install', 'golang-go'])
  expect(runtimeInstallCommands('rust', 'linux', undefined, 'dnf')[0].args).toEqual(['dnf', 'install', 'rust', 'cargo'])
  expect(runtimeInstallCommands('go', 'linux', undefined, 'dnf')[0].args).toEqual(['dnf', 'install', 'golang'])
  expect(runtimeInstallCommands('rust', 'linux', undefined, 'pacman')[0].args).toEqual(['pacman', '-S', 'rust'])
  expect(runtimeInstallCommands('go', 'linux', undefined, 'pacman')[0].args).toEqual(['pacman', '-S', 'go'])
  expect(() => runtimeInstallCommands('rust', 'linux', '1', 'apt-get')).toThrow('does not support -v')
  expect(() => runtimeInstallCommands('go', 'linux')).toThrow('No supported package manager')
  expect(() => runtimeInstallCommands('node', 'linux', undefined, 'dnf')).toThrow('Debian/Ubuntu only')
})
