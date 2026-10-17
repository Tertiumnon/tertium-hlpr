import { describe, expect, test } from 'bun:test'
import type { AwsRunner } from '../../../core/aws/param-store.js'
import { parseReadArgs, readParameter } from './read.js'

describe('aws-param-store read', () => {
  test('parses -name with one parameter name', () => {
    expect(parseReadArgs(['-name', '/env/app/env.dev'])).toBe('/env/app/env.dev')
    expect(() => parseReadArgs(['/env/app/env.dev'])).toThrow('Usage: hlpr aws-param-store read')
    expect(() => parseReadArgs(['-name'])).toThrow('Usage: hlpr aws-param-store read')
    expect(() => parseReadArgs(['-name', '/env/app/env.dev', 'extra'])).toThrow('Usage: hlpr aws-param-store read')
    expect(() => parseReadArgs(['-name', 'env/app'])).toThrow('Invalid -name')
  })

  test('returns the value exactly as stored', () => {
    const aws: AwsRunner = () => JSON.stringify({ Parameter: { Name: '/x', Type: 'String', Value: 'A=1\n\nB=2\n', Version: 1 } })
    expect(readParameter('/x', aws)).toBe('A=1\n\nB=2\n')
  })
})
