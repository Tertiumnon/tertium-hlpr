import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { hostAliasesFor } from './config.js'
import { parseRemoteFileArgs, remoteShellPath, resolveRemoteFile } from './remote.js'

const usage = 'Usage: hlpr file read -host <hostname> -path <path>'

const config = [
  'Host web api',
  '    HostName 10.0.0.5',
  '    User deploy',
  '',
  'Host other',
  '    HostName example.com',
  'Host *',
  '    HostName 10.0.0.5',
  'Match host *.internal',
  '    User admin',
  '',
].join('\n')

describe('remote file args', () => {
  test('parses -host and -path in any order', () => {
    expect(parseRemoteFileArgs(['-path', '/etc/hosts', '-host', '10.0.0.5'], usage)).toEqual({ path: '/etc/hosts', host: '10.0.0.5' })
  })

  test('rejects duplicates, missing values and missing flags', () => {
    expect(() => parseRemoteFileArgs(['-path', '/a', '-path', '/b', '-host', 'h'], usage)).toThrow(usage)
    expect(() => parseRemoteFileArgs(['-path', '-x', '-host', 'h'], usage)).toThrow(usage)
    expect(() => parseRemoteFileArgs(['-path', '/a'], usage)).toThrow(usage)
  })
})

describe('hostAliasesFor', () => {
  test('returns every alias of blocks whose HostName matches, ignoring wildcard blocks', () => {
    expect(hostAliasesFor(config, '10.0.0.5')).toEqual(['web', 'api'])
    expect(hostAliasesFor(config, 'EXAMPLE.com')).toEqual(['other'])
    expect(hostAliasesFor(config, 'missing.host')).toEqual([])
  })
})

describe('resolveRemoteFile', () => {
  test('maps -host to the Host alias from the config file', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'hlpr-remote-'))
    try {
      const configPath = path.join(dir, 'config')
      writeFileSync(configPath, config)
      expect(resolveRemoteFile({ path: '/a', host: 'example.com' }, configPath)).toEqual({ path: '/a', sshConfig: 'other' })
      expect(() => resolveRemoteFile({ path: '/a', host: 'nope' }, configPath)).toThrow('No SSH config entry with HostName "nope"')
      expect(() => resolveRemoteFile({ path: '/a', host: '10.0.0.5' }, configPath)).toThrow('Several SSH config entries')
      expect(() => resolveRemoteFile({ path: '/a', host: 'x' }, path.join(dir, 'absent'))).toThrow('No SSH config found')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('remoteShellPath', () => {
  test('single-quotes paths and keeps a leading ~/ expandable', () => {
    expect(remoteShellPath('/etc/hosts')).toBe("'/etc/hosts'")
    expect(remoteShellPath('~/notes/my file.txt')).toBe("~/'notes/my file.txt'")
    expect(remoteShellPath("/tmp/it's")).toBe("'/tmp/it'\\''s'")
  })
})
