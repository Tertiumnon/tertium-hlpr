import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { getParameter, putParameter, validateParamName } from './param-store.js'

describe('aws param store core', () => {
  test('getParameter reads the exact value, type and version from JSON output', () => {
    const calls: string[][] = []
    const aws = (args: string[]) => {
      calls.push(args)
      return JSON.stringify({ Parameter: { Name: '/env/app/env.dev', Type: 'SecureString', Value: 'A=1\nB=2\n', Version: 7 } })
    }
    expect(getParameter('/env/app/env.dev', aws)).toEqual({ name: '/env/app/env.dev', type: 'SecureString', value: 'A=1\nB=2\n', version: 7 })
    expect(calls[0]).toEqual(['ssm', 'get-parameter', '--name', '/env/app/env.dev', '--with-decryption', '--output', 'json'])
  })

  test('putParameter keeps the type, passes the value from a file, and removes the file afterwards', () => {
    let seenFile = ''
    let seenContent = ''
    const aws = (args: string[]) => {
      const valueArg = args[args.indexOf('--value') + 1]
      seenFile = valueArg.replace(/^file:\/\//, '')
      seenContent = readFileSync(seenFile, 'utf-8')
      expect(args).toContain('--overwrite')
      expect(args[args.indexOf('--type') + 1]).toBe('SecureString')
      return JSON.stringify({ Version: 8, Tier: 'Standard' })
    }
    const version = putParameter({ name: '/env/app/env.dev', type: 'SecureString', value: 'old', version: 7 }, 'new=1\n', aws)
    expect(version).toBe(8)
    expect(seenContent).toBe('new=1\n')
    expect(existsSync(seenFile)).toBe(false)
  })

  test('putParameter removes the temp file even when the write fails', () => {
    let seenFile = ''
    const aws = (args: string[]) => {
      seenFile = args[args.indexOf('--value') + 1].replace(/^file:\/\//, '')
      throw new Error('AccessDenied')
    }
    expect(() => putParameter({ name: '/env/x', type: 'String', value: '', version: 1 }, 'v', aws)).toThrow('AccessDenied')
    expect(existsSync(seenFile)).toBe(false)
  })

  test('validates parameter names', () => {
    expect(validateParamName('/env/app/env.dev')).toBe('/env/app/env.dev')
    expect(() => validateParamName('env/app')).toThrow('Invalid -name')
    expect(() => validateParamName('/env/app;rm')).toThrow('Invalid -name')
  })
})
