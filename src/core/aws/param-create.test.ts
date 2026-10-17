import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { createParameter, deleteParameter } from './param-store.js'

describe('create and delete a parameter', () => {
  test('creates a parameter without overwriting, with the value from a file, and removes the file', () => {
    let seenFile = ''
    let seenContent = ''
    const args: string[][] = []
    const aws = (a: string[]) => {
      args.push(a)
      seenFile = a[a.indexOf('--value') + 1].replace(/^file:\/\//, '')
      seenContent = readFileSync(seenFile, 'utf-8')
      return JSON.stringify({ Version: 1 })
    }
    expect(createParameter('/env/app/env.dev', 'A=1\n', 'SecureString', aws)).toBe(1)
    expect(args[0]).toContain('put-parameter')
    expect(args[0]).not.toContain('--overwrite')
    expect(args[0][args[0].indexOf('--type') + 1]).toBe('SecureString')
    expect(seenContent).toBe('A=1\n')
    expect(existsSync(seenFile)).toBe(false)
  })

  test('removes the temp file even when AWS refuses the name', () => {
    let seenFile = ''
    const aws = (a: string[]) => {
      seenFile = a[a.indexOf('--value') + 1].replace(/^file:\/\//, '')
      throw new Error('ParameterAlreadyExists')
    }
    expect(() => createParameter('/env/app/env.dev', 'A=1', 'String', aws)).toThrow('ParameterAlreadyExists')
    expect(existsSync(seenFile)).toBe(false)
  })

  test('deletes by name', () => {
    const calls: string[][] = []
    deleteParameter('/env/app/env.dev', a => { calls.push(a); return '' })
    expect(calls).toEqual([['ssm', 'delete-parameter', '--name', '/env/app/env.dev']])
  })
})
