import { describe, expect, test } from 'bun:test'
import { parseRemoveArgs } from './remove.js'

describe('aws-param-store remove args', () => {
  test('needs -name and -confirm, the same name twice', () => {
    expect(parseRemoveArgs(['-name', '/env/app/env.dev', '-confirm', '/env/app/env.dev'])).toEqual({ name: '/env/app/env.dev' })
    expect(() => parseRemoveArgs(['-name', '/env/app/env.dev'])).toThrow('Usage: hlpr aws-param-store remove')
    expect(() => parseRemoveArgs(['-confirm', '/env/app/env.dev'])).toThrow('Usage: hlpr aws-param-store remove')
  })

  test('refuses a confirmation that is not the name', () => {
    expect(() => parseRemoveArgs(['-name', '/env/app/env.dev', '-confirm', '/env/app/env.prod'])).toThrow('nothing was removed')
    expect(() => parseRemoveArgs(['-name', '/env/app/env.dev', '-confirm', 'yes'])).toThrow('nothing was removed')
  })

  test('validates the name', () => {
    expect(() => parseRemoveArgs(['-name', 'env/app', '-confirm', 'env/app'])).toThrow('Invalid -name')
  })
})
