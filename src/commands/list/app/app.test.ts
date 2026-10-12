import { describe, expect, test } from 'bun:test'
import { installedAppsCommand } from './app.js'

describe('list app', () => {
  test('uses the operating system package manager', () => {
    expect(installedAppsCommand('win32')).toEqual({ command: 'winget', args: ['list'] })
    expect(installedAppsCommand('darwin')).toEqual({ command: 'brew', args: ['list', '--versions'] })
    expect(installedAppsCommand('linux')).toEqual({ command: 'apt', args: ['list', '--installed'] })
  })
})
