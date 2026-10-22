import { expect, test } from 'bun:test'
import type { SpawnSyncReturns } from 'node:child_process'
import { installedApps, parseRemoteSearch, remoteApps, remoteSearchQueries } from '../../../core/command/apps.js'
import { matchingAppNames, matchingRemoteApps } from './search.js'

test('searches installed app names by case-insensitive substring and removes duplicates', () => {
  const apps = [
    { manager: 'winget', name: 'Visual Studio Code', id: 'Microsoft.VSCode' },
    { manager: 'choco', name: 'Visual Studio Code', id: 'vscode' },
    { manager: 'winget', name: 'Android Studio', id: 'Google.AndroidStudio' },
  ]
  expect(matchingAppNames(apps, 'STUDIO')).toEqual(['Android Studio', 'Visual Studio Code'])
  expect(matchingAppNames(apps, 'missing')).toEqual([])
})

test('formats remote matches with their manager and removes duplicates', () => {
  const apps = [
    { manager: 'winget', name: 'Visual Studio Code', id: 'Microsoft.VSCode' },
    { manager: 'choco', name: 'Visual Studio Code', id: 'vscode' },
    { manager: 'winget', name: 'Android Studio', id: 'Google.AndroidStudio' },
  ]
  expect(matchingRemoteApps(apps, 'STUDIO')).toEqual(['Android Studio [winget]', 'Visual Studio Code [choco]', 'Visual Studio Code [winget]'])
  expect(matchingRemoteApps(apps, 'missing')).toEqual([])
})

test('parses winget search output into name and id', () => {
  const nameCol = 22
  const idCol = 32
  const header = `${'Name'.padEnd(nameCol)}${'Id'.padEnd(idCol)}Version`
  const row1 = `${'Visual Studio Code'.padEnd(nameCol)}${'Microsoft.VSCode'.padEnd(idCol)}1.90.0`
  const row2 = `${'Android Studio'.padEnd(nameCol)}${'Google.AndroidStudio'.padEnd(idCol)}2024.1`
  const row3 = 'Claude Code 配置管理器 - 命令行版本      ronghuaxueleng.ClaudeCodeConfigManager.CLI 1.7.0'
  const output = [header, '-'.repeat(header.length), row1, row2, row3].join('\n')
  expect(parseRemoteSearch('winget', output)).toEqual([
    { manager: 'winget', name: 'Visual Studio Code', id: 'Microsoft.VSCode' },
    { manager: 'winget', name: 'Android Studio', id: 'Google.AndroidStudio' },
    { manager: 'winget', name: 'Claude Code 配置管理器 - 命令行版本', id: 'ronghuaxueleng.ClaudeCodeConfigManager.CLI' },
  ])
})

test('parses machine-readable DNF repoquery output', () => {
  const output = [
    'git',
    'git-core',
    'Last metadata expiration check: 0:00:01 ago',
  ].join('\n')
  expect(parseRemoteSearch('dnf', output)).toEqual([
    { manager: 'dnf', name: 'git', id: 'git' },
    { manager: 'dnf', name: 'git-core', id: 'git-core' },
  ])
})

const result = (stdout = '', status = 0, stderr = ''): SpawnSyncReturns<string> => ({
  pid: 0, output: [], stdout, stderr, status, signal: null,
})
const missing = (): SpawnSyncReturns<string> => ({
  ...result('', 1), error: Object.assign(new Error('Not installed'), { code: 'ENOENT' }),
})

test('keeps headerless Homebrew casks separate from formulae and allows empty formula results', () => {
  expect(remoteSearchQueries('darwin', 'sourcetree')).toEqual([
    { manager: 'brew', command: 'brew', args: ['search', '--formula', 'sourcetree'] },
    { manager: 'brew-cask', command: 'brew', args: ['search', '--cask', 'sourcetree'] },
  ])
  expect(remoteApps('darwin', 'sourcetree', (command, args, options) => {
    expect(command).toBe('brew')
    expect(options.env?.LC_ALL).toBe('C')
    return args.includes('--cask') ? result('sourcetree\n') : result('', 1, 'Error: No formulae or casks found for "sourcetree".')
  })).toEqual([{ manager: 'brew-cask', name: 'sourcetree', id: 'sourcetree' }])
})

test('Linux empty searches do not discard results from another manager', () => {
  expect(remoteApps('linux', 'curl', (command, args, options) => {
    expect(options.env?.LC_ALL).toBe('C')
    if (command === 'apt-cache') return result('curl - command line transfer tool\n')
    if (command === 'pacman') return result('', 1)
    if (command === 'zypper') {
      expect(args).toEqual(['search', '--type', 'package', 'curl'])
      return result('No matching items found.\n', 104)
    }
    if (command === 'dnf') {
      expect(args).toEqual(['-q', 'repoquery', '--available', '--queryformat', '%{name}', '*curl*'])
      return result('curl\nlibcurl\n')
    }
    return missing()
  })).toEqual([
    { manager: 'apt', name: 'curl', id: 'curl' },
    { manager: 'dnf', name: 'curl', id: 'curl' },
    { manager: 'dnf', name: 'libcurl', id: 'libcurl' },
  ])
})

test('reports genuine manager failures instead of treating them as empty searches', () => {
  expect(() => remoteApps('darwin', 'curl', () => result('', 1, 'Permission denied'))).toThrow('brew search failed: Permission denied')
  expect(() => remoteApps('linux', 'curl', command => command === 'pacman' ? result('', 1, 'error: database unavailable') : missing())).toThrow('pacman search failed: error: database unavailable')
  expect(() => remoteApps('linux', 'curl', command => command === 'zypper' ? result('', 4, 'Repository unavailable') : missing())).toThrow('zypper search failed: Repository unavailable')
  expect(() => remoteApps('darwin', 'curl', missing)).toThrow('No supported package manager found on darwin')
})

test('installed Linux packages exclude residual dpkg entries and unusable DNF frontends', () => {
  expect(installedApps('linux', (command, args, options) => {
    if (command === 'dnf') return result('', 1)
    if (command === 'rpm') throw new Error('Should not assign RPM packages to an unusable DNF frontend')
    if (command === 'dpkg-query') {
      expect(args).toEqual(['-W', `-f=\${db:Status-Status}\t\${binary:Package}\n`])
      expect(options.env?.LC_ALL).toBe('C')
      return result('installed\tcurl\nconfig-files\tremoved-app\nnot-installed\tpurged-app\ninstalled\tlibcurl4:amd64\n')
    }
    if (command === 'zypper') return result('No matching items found.\n', 104)
    return missing()
  })).toEqual([
    { manager: 'apt', name: 'curl', id: 'curl' },
    { manager: 'apt', name: 'libcurl4:amd64', id: 'libcurl4:amd64' },
  ])
})

test('parses simple name-line search output', () => {
  const output = ['git', 'git-core', 'git-lfs'].join('\n')
  expect(parseRemoteSearch('brew', output)).toEqual([
    { manager: 'brew', name: 'git', id: 'git' },
    { manager: 'brew', name: 'git-core', id: 'git-core' },
    { manager: 'brew', name: 'git-lfs', id: 'git-lfs' },
  ])
})
