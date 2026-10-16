import { expect, test } from 'bun:test'
import { parseRemoteSearch } from '../../../core/command/apps.js'
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

test('parses dnf search output from Name lines', () => {
  const output = [
    'Name    : git',
    'Summary : The Git source code manager',
    'Name    : git-core',
  ].join('\n')
  expect(parseRemoteSearch('dnf', output)).toEqual([
    { manager: 'dnf', name: 'git', id: 'git' },
    { manager: 'dnf', name: 'git-core', id: 'git-core' },
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
