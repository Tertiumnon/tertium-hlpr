import { describe, expect, test } from 'bun:test'
import type { AwsRunner } from '../../../core/aws/param-store.js'
import { parseReadArgs, readParameter, readParameterKey } from './read.js'

const fakeAws = (value: string): AwsRunner => () => JSON.stringify({ Parameter: { Name: '/x', Type: 'String', Value: value, Version: 1 } })

describe('aws-param-store read', () => {
  test('parses -name, with an optional -key', () => {
    expect(parseReadArgs(['-name', '/env/app/env.dev'])).toEqual({ name: '/env/app/env.dev', key: undefined })
    expect(parseReadArgs(['-key', 'DB_PASSWORD', '-name', '/env/app/env.dev'])).toEqual({ name: '/env/app/env.dev', key: 'DB_PASSWORD' })
    expect(() => parseReadArgs(['/env/app/env.dev'])).toThrow('Usage: hlpr aws-param-store read')
    expect(() => parseReadArgs(['-name'])).toThrow('Usage: hlpr aws-param-store read')
    expect(() => parseReadArgs(['-name', '/env/app/env.dev', 'extra'])).toThrow('Usage: hlpr aws-param-store read')
    expect(() => parseReadArgs(['-name', 'env/app'])).toThrow('Invalid -name')
    expect(() => parseReadArgs(['-name', '/env/app/env.dev', '-key', 'DB-PASSWORD'])).toThrow('Invalid -key')
  })

  test('returns the value exactly as stored', () => {
    expect(readParameter('/x', fakeAws('A=1\n\nB=2\n'))).toBe('A=1\n\nB=2\n')
  })

  test('returns one variable without quotes', () => {
    expect(readParameterKey('/x', 'DB_PASSWORD', fakeAws('APP=a\nDB_PASSWORD="p#ss"\n'))).toBe('p#ss')
  })
})
