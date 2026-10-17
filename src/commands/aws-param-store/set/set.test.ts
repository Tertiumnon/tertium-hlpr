import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import type { AwsRunner } from '../../../core/aws/param-store.js'
import { parseSetArgs, setParameterKey } from './set.js'

// A fake AWS CLI holding one .env parameter; records every write.
function fakeAws(value: string, type = 'SecureString') {
  const writes: { value: string, type: string }[] = []
  const aws: AwsRunner = args => {
    if (args[1] === 'get-parameter') return JSON.stringify({ Parameter: { Name: '/env/app/env.prod', Type: type, Value: value, Version: 3 } })
    if (args[1] === 'put-parameter') {
      const file = args[args.indexOf('--value') + 1].replace(/^file:\/\//, '')
      writes.push({ value: readFileSync(file, 'utf-8'), type: args[args.indexOf('--type') + 1] })
      return JSON.stringify({ Version: 4 })
    }
    throw new Error(`unexpected ${args.join(' ')}`)
  }
  return { aws, writes }
}

const env = 'APP=dungeons\nDB_PASSWORD=old\nDB_HOST=10.0.0.5\n'

describe('aws-param-store set', () => {
  test('parses -name, -key and an optional -value, in any order', () => {
    expect(parseSetArgs(['-key', 'DB_PASSWORD', '-name', '/env/app/env.prod'])).toEqual({ name: '/env/app/env.prod', key: 'DB_PASSWORD', value: undefined })
    expect(parseSetArgs(['-name', '/env/app/env.prod', '-key', 'DB_PASSWORD', '-value', '-x-1'])).toEqual({ name: '/env/app/env.prod', key: 'DB_PASSWORD', value: '-x-1' })
    expect(() => parseSetArgs(['-name', '/env/app/env.prod', '-key'])).toThrow('Usage: hlpr aws-param-store set')
    expect(() => parseSetArgs(['-name', '/env/app/env.prod', '-key', 'DB_PASSWORD', '-key', 'X'])).toThrow('Usage: hlpr aws-param-store set')
    expect(() => parseSetArgs(['-name', '/env/app/env.prod', '-key', 'DB-PASSWORD'])).toThrow('Invalid -key')
  })

  test('replaces only the named line and keeps the parameter type', () => {
    const { aws, writes } = fakeAws(env)
    expect(setParameterKey('/env/app/env.prod', 'DB_PASSWORD', 'new-pass', aws)).toBe(4)
    expect(writes).toEqual([{ value: 'APP=dungeons\nDB_PASSWORD=new-pass\nDB_HOST=10.0.0.5\n', type: 'SecureString' }])
  })

  test('writes nothing when the line already holds the value', () => {
    const { aws, writes } = fakeAws(env)
    expect(setParameterKey('/env/app/env.prod', 'DB_PASSWORD', 'old', aws)).toBeUndefined()
    expect(writes).toEqual([])
  })

  test('refuses a missing key without writing', () => {
    const { aws, writes } = fakeAws(env)
    expect(() => setParameterKey('/env/app/env.prod', 'MISSING', 'x', aws)).toThrow('No MISSING line in the value')
    expect(writes).toEqual([])
  })
})
