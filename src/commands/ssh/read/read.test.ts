import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { readConnection, parseReadArgs } from './read.js'

const config = [
  'Host web api',
  '    HostName 10.0.0.5',
  '    User deploy',
  '',
  'Host other',
  '    HostName example.com',
  'Match host *.internal',
  '    User admin',
  '',
].join('\n')

describe('ssh read', () => {
  test('accepts -f or -file with one connection name', () => {
    expect(parseReadArgs(['-f', 'web'])).toBe('web')
    expect(parseReadArgs(['-file', 'web'])).toBe('web')
    expect(() => parseReadArgs(['web'])).toThrow('Usage: hlpr ssh read')
    expect(() => parseReadArgs(['-f'])).toThrow('Usage: hlpr ssh read')
    expect(() => parseReadArgs(['-f', 'web', 'extra'])).toThrow('Usage: hlpr ssh read')
    expect(() => parseReadArgs(['-f', '-x'])).toThrow('Usage: hlpr ssh read')
  })

  test('prints only the requested Host block, including every alias on the line', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'hlpr-ssh-read-'))
    try {
      const configPath = path.join(dir, 'config')
      await writeFile(configPath, config)
      expect(await readConnection('api', configPath)).toBe('Host web api\n    HostName 10.0.0.5\n    User deploy\n')
      expect(await readConnection('other', configPath)).toBe('Host other\n    HostName example.com\n')
      await expect(readConnection('missing', configPath)).rejects.toThrow('No Host entry "missing"')
      await expect(readConnection('web', path.join(dir, 'absent'))).rejects.toThrow('No SSH config found')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
