import { describe, expect, test } from 'bun:test'
import { resolveCommandAlias, resolveSubcommandAlias } from './aliases.js'

describe('command aliases', () => {
  test('i resolves to install', () => {
    expect(resolveCommandAlias('i')).toBe('install')
    expect(resolveCommandAlias('install')).toBe('install')
  })

  test('rn resolves to rename', () => {
    expect(resolveCommandAlias('rn')).toBe('rename')
    expect(resolveCommandAlias('rename')).toBe('rename')
  })

  test('git rm resolves to git remove', () => {
    expect(resolveSubcommandAlias('git', 'rm')).toBe('remove')
    expect(resolveSubcommandAlias('other', 'rm')).toBe('rm')
  })
})
