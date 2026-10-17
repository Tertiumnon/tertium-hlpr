import { describe, expect, test } from 'bun:test'
import { addParameter, parseAddArgs } from './add.js'

describe('aws-param-store add args', () => {
  test('takes -name, with SecureString as the default type', () => {
    expect(parseAddArgs(['-name', '/env/app/env.dev'])).toEqual({ name: '/env/app/env.dev', type: 'SecureString', value: undefined })
  })

  test('takes -type and -value', () => {
    expect(parseAddArgs(['-type', 'String', '-name', '/env/app/x', '-value', 'v'])).toEqual({ name: '/env/app/x', type: 'String', value: 'v' })
    expect(parseAddArgs(['-name', '/env/app/x', '-value', '-starts-with-dash']).value).toBe('-starts-with-dash')
  })

  test('rejects a missing name, an unknown type, and an empty value', () => {
    expect(() => parseAddArgs(['-value', 'v'])).toThrow('Usage: hlpr aws-param-store add')
    expect(() => parseAddArgs(['-name', '/env/app/x', '-type', 'StringList'])).toThrow('Invalid -type')
    expect(() => parseAddArgs(['-name', '/env/app/x', '-value', ''])).toThrow('Invalid -value')
    expect(() => parseAddArgs(['-name', 'env/app'])).toThrow('Invalid -name')
  })

  test('refuses an empty value from stdin before calling AWS', () => {
    expect(() => addParameter({ name: '/env/x', type: 'SecureString' }, '', () => { throw new Error('should not run') })).toThrow('empty')
  })
})
