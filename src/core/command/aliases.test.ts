import { describe, expect, test } from 'bun:test'
import { resolveCommandAlias } from './aliases.js'

describe('command aliases', () => {
  test('i resolves to install', () => {
    expect(resolveCommandAlias('i')).toBe('install')
    expect(resolveCommandAlias('install')).toBe('install')
  })

  test('rn resolves to rename', () => {
    expect(resolveCommandAlias('rn')).toBe('rename')
    expect(resolveCommandAlias('rename')).toBe('rename')
  })
})
