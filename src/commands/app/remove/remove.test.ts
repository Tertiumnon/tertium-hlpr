import { expect, test } from 'bun:test'
import { parsePackages, uninstallCommand } from './remove.js'

test('parses package names and exact IDs from manager output', () => {
  expect(parsePackages('winget', 'Name                 Id                  Version\n---------------------------------------------------\nVisual Studio Code   Microsoft.VSCode    1.2.3\n')).toEqual([
    { manager: 'winget', name: 'Visual Studio Code', id: 'Microsoft.VSCode' },
  ])
  expect(parsePackages('choco', 'git|2.1\n')).toEqual([{ manager: 'choco', name: 'git', id: 'git' }])
  expect(parsePackages('apt', 'installed\tcurl\nconfig-files\tremoved-app\n')).toEqual([{ manager: 'apt', id: 'curl', name: 'curl' }])
  expect(parsePackages('dnf', 'firefox\n')).toEqual([{ manager: 'dnf', id: 'firefox', name: 'firefox' }])
  expect(parsePackages('pacman', 'pacman\n')).toEqual([{ manager: 'pacman', id: 'pacman', name: 'pacman' }])
  expect(parsePackages('scoop', "WARN  There aren't any apps installed.\n")).toEqual([])
})

test('uninstalls by selected manager and exact package ID', () => {
  expect(uninstallCommand({ manager: 'winget', name: 'Code', id: 'Microsoft.VSCode' })).toEqual({ command: 'winget', args: ['uninstall', '--id', 'Microsoft.VSCode', '--exact'] })
  expect(uninstallCommand({ manager: 'brew-cask', name: 'firefox', id: 'firefox' })).toEqual({ command: 'brew', args: ['uninstall', '--cask', 'firefox'] })
  expect(uninstallCommand({ manager: 'brew', name: 'git', id: 'git' })).toEqual({ command: 'brew', args: ['uninstall', '--formula', 'git'] })
  expect(uninstallCommand({ manager: 'apt', name: 'libcurl4:amd64', id: 'libcurl4:amd64' })).toEqual({ command: 'sudo', args: ['apt-get', 'remove', 'libcurl4:amd64'] })
  expect(uninstallCommand({ manager: 'dnf', name: 'firefox', id: 'firefox' })).toEqual({ command: 'sudo', args: ['dnf', 'remove', 'firefox'] })
  expect(uninstallCommand({ manager: 'pacman', name: 'curl', id: 'curl' })).toEqual({ command: 'sudo', args: ['pacman', '-R', 'curl'] })
})
