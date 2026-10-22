import { expect, test } from 'bun:test'
import { appChoices, appLabel, installCommand, matchingApps, parsePackages, parseRemoteSearch, uninstallCommand } from '../../../core/command/apps.js'

test('parses remote results from each manager', () => {
  expect(parseRemoteSearch('winget', 'Name              Id                 Version Source\n----------------------------------------------------------\nVisual Studio Code Microsoft.VisualStudioCode 1.2 winget\n')).toEqual([
    { manager: 'winget', name: 'Visual Studio Code', id: 'Microsoft.VisualStudioCode' },
  ])
  expect(parseRemoteSearch('brew', '==> Formulae\ngit git-lfs\n==> Casks\nfirefox\nError: nothing\n')).toEqual([
    { manager: 'brew', name: 'git', id: 'git' },
    { manager: 'brew', name: 'git-lfs', id: 'git-lfs' },
    { manager: 'brew-cask', name: 'firefox', id: 'firefox' },
  ])
  expect(parseRemoteSearch('pacman', 'extra/firefox 125.0-1\n    Standalone web browser\ncore/curl 8.0-1\n    Command line tool\n')).toEqual([
    { manager: 'pacman', name: 'firefox', id: 'firefox' },
    { manager: 'pacman', name: 'curl', id: 'curl' },
  ])
  expect(parseRemoteSearch('choco', 'Chocolatey v2.4.3\n3 validations performed.\n - A pending reboot\nfirefox|130.0\nfirefox-esr|115.0\n')).toEqual([
    { manager: 'choco', name: 'firefox', id: 'firefox' },
    { manager: 'choco', name: 'firefox-esr', id: 'firefox-esr' },
  ])
  expect(parseRemoteSearch('scoop', 'Results from local buckets...\r\n\u001b[32;1mName\u001b[0m Version Source Binaries\r\n----  ------- ------ --------\r\nfirefox 130.0 extras\r\nfirefox-esr 115.0 versions\r\n')).toEqual([
    { manager: 'scoop', name: 'firefox', id: 'firefox' },
    { manager: 'scoop', name: 'firefox-esr', id: 'firefox-esr' },
  ])
})

test('does not offer Scoop results from unconfigured buckets', () => {
  expect(parseRemoteSearch('scoop', "Results from other known buckets...\n(add them using 'scoop bucket add <bucket name>')\n\nName       Source\n----       ------\nsourcetree extras\n")).toEqual([])
})

test('preserves Chocolatey and Scoop search IDs in install commands', () => {
  const choco = parseRemoteSearch('choco', 'SourceTree|3.4.30\nsourcetree-disableautoupdate|1.0.0\n')
  expect(installCommand(choco[0])).toEqual({ command: 'cmd.exe', args: ['/d', '/c', 'choco', 'install', 'SourceTree', '-y'] })
  const scoop = parseRemoteSearch('scoop', 'Results from local buckets...\nName       Version Source Binaries\n----       ------- ------ --------\nsourcetree 3.4.30  extras\n')
  expect(installCommand(scoop[0])).toEqual({ command: 'cmd.exe', args: ['/d', '/c', 'scoop', 'install', 'sourcetree'] })
})

test('lists each package once, sorted by name', () => {
  const choices = appChoices([
    { manager: 'winget', name: 'Zed', id: 'Zed.Zed' },
    { manager: 'winget', name: 'Code', id: 'Microsoft.VSCode' },
    { manager: 'winget', name: 'Code', id: 'Microsoft.VSCode' },
  ])
  expect(choices.map(appLabel)).toEqual(['Code (Microsoft.VSCode) [winget]', 'Zed (Zed.Zed) [winget]'])
})

test('installs the winget ID when search includes match metadata', () => {
  const output = [
    'Name       Id                   Version Match                   Source',
    '----------------------------------------------------------------------',
    'Sourcetree Atlassian.Sourcetree 3.4.32  ProductCode: sourcetree winget',
  ].join('\r\n')
  const apps = parseRemoteSearch('winget', output)
  expect(apps).toEqual([{ manager: 'winget', name: 'Sourcetree', id: 'Atlassian.Sourcetree' }])
  expect(appLabel(apps[0])).toBe('Sourcetree (Atlassian.Sourcetree) [winget]')
  expect(installCommand(apps[0])).toEqual({ command: 'winget', args: ['install', '--id', 'Atlassian.Sourcetree', '--exact'] })
})

test('parses winget match columns with empty and multiword values and wide names', () => {
  const header = `${'Name'.padEnd(24)}${'Id'.padEnd(24)}${'Version'.padEnd(12)}${'Match'.padEnd(32)}Source`
  const output = [
    header,
    '-'.repeat(header.length),
    `${'Visual Studio Code'.padEnd(24)}${'Microsoft.VSCode'.padEnd(24)}${'1.90.0'.padEnd(12)}${''.padEnd(32)}winget`,
    `${'代码管理器'.padEnd(19)}${'Example.Code'.padEnd(24)}${'1.0'.padEnd(12)}${'Tag: source code manager'.padEnd(32)}winget`,
  ].join('\n')
  expect(parseRemoteSearch('winget', output)).toEqual([
    { manager: 'winget', name: 'Visual Studio Code', id: 'Microsoft.VSCode' },
    { manager: 'winget', name: '代码管理器', id: 'Example.Code' },
  ])
})

test('installs by selected manager and exact package ID', () => {
  expect(installCommand({ manager: 'winget', name: 'Code', id: 'Microsoft.VSCode' })).toEqual({ command: 'winget', args: ['install', '--id', 'Microsoft.VSCode', '--exact'] })
  expect(installCommand({ manager: 'brew-cask', name: 'firefox', id: 'firefox' })).toEqual({ command: 'brew', args: ['install', '--cask', 'firefox'] })
  expect(installCommand({ manager: 'apt', name: 'curl', id: 'curl' })).toEqual({ command: 'sudo', args: ['apt-get', 'install', 'curl'] })
  expect(installCommand({ manager: 'pacman', name: 'curl', id: 'curl' })).toEqual({ command: 'sudo', args: ['pacman', '-S', 'curl'] })
  expect(() => installCommand({ manager: 'apt', name: 'x', id: '--force' })).toThrow('Invalid apt package ID')
})

test('parses snap, flatpak, and zypper packages and results', () => {
  expect(parsePackages('snap', 'Name    Version  Rev  Tracking  Publisher  Notes\ncore22  20240111  1122  latest/stable  canonical  base\n')).toEqual([
    { manager: 'snap', name: 'core22', id: 'core22' },
  ])
  expect(parsePackages('snap', 'No snaps are installed yet. Try "snap install hello-world".\n')).toEqual([])
  expect(parsePackages('flatpak', 'org.mozilla.firefox\norg.gnome.Calculator\n')).toEqual([
    { manager: 'flatpak', name: 'org.mozilla.firefox', id: 'org.mozilla.firefox' },
    { manager: 'flatpak', name: 'org.gnome.Calculator', id: 'org.gnome.Calculator' },
  ])
  expect(parsePackages('zypper', 'S | Name | Summary | Type\n--+--+--\ni+ | git | Fast version control | package\n')).toEqual([
    { manager: 'zypper', name: 'git', id: 'git' },
  ])
  expect(parseRemoteSearch('flatpak', 'org.mozilla.firefox\tFirefox\nNo matches found\n')).toEqual([
    { manager: 'flatpak', name: 'Firefox', id: 'org.mozilla.firefox' },
  ])
  expect(parseRemoteSearch('snap', 'Name     Version  Publisher  Notes  Summary\nfirefox  125.0  mozilla  -  Browser\n')).toEqual([
    { manager: 'snap', name: 'firefox', id: 'firefox' },
  ])
  expect(parseRemoteSearch('zypper', 'S | Name | Summary | Type\n--+--\n | git | Fast version control | package\n')).toEqual([
    { manager: 'zypper', name: 'git', id: 'git' },
  ])
})

test('installs and removes snap, flatpak, and zypper packages', () => {
  expect(installCommand({ manager: 'flatpak', name: 'Firefox', id: 'org.mozilla.firefox' })).toEqual({ command: 'flatpak', args: ['install', 'org.mozilla.firefox'] })
  expect(installCommand({ manager: 'snap', name: 'firefox', id: 'firefox' })).toEqual({ command: 'sudo', args: ['snap', 'install', 'firefox'] })
  expect(installCommand({ manager: 'zypper', name: 'git', id: 'git' })).toEqual({ command: 'sudo', args: ['zypper', 'install', '-y', 'git'] })
  expect(uninstallCommand({ manager: 'flatpak', name: 'Firefox', id: 'org.mozilla.firefox' })).toEqual({ command: 'flatpak', args: ['uninstall', 'org.mozilla.firefox'] })
  expect(uninstallCommand({ manager: 'snap', name: 'firefox', id: 'firefox' })).toEqual({ command: 'sudo', args: ['snap', 'remove', 'firefox'] })
  expect(uninstallCommand({ manager: 'zypper', name: 'git', id: 'git' })).toEqual({ command: 'sudo', args: ['zypper', 'remove', '-y', 'git'] })
})

test('matches only package names, not descriptions', () => {
  const apps = [
    { manager: 'apt', name: 'curl', id: 'curl' },
    { manager: 'winget', name: 'Visual Studio Code', id: 'Microsoft.VisualStudioCode' },
  ]
  expect(matchingApps(apps, 'tool')).toEqual([])
  expect(matchingApps(apps, 'CODE')).toEqual([apps[1]])
  expect(matchingApps(apps, 'microsoft')).toEqual([])
})
