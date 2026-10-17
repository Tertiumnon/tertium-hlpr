import { describe, expect, test } from 'bun:test'
import { resolveSubcommandAlias, subcommandAliases } from './aliases.js'

describe('command aliases', () => {
  test('app removal synonyms resolve to remove', () => {
    expect(resolveSubcommandAlias('app', 'delete')).toBe('remove')
    expect(resolveSubcommandAlias('app', 'uninstall')).toBe('remove')
  })

  test('app find resolves to search', () => {
    expect(resolveSubcommandAlias('app', 'find')).toBe('search')
  })

  test('file search resolves to find', () => {
    expect(resolveSubcommandAlias('file', 'search')).toBe('find')
  })

  test('lists the same aliases for help', () => {
    expect(subcommandAliases('app', 'remove')).toEqual(['delete', 'uninstall'])
    expect(subcommandAliases('file', 'find')).toEqual(['search'])
  })

  test('info and status are synonyms for system state commands', () => {
    for (const category of ['battery', 'net']) expect(resolveSubcommandAlias(category, 'info')).toBe('status')
    for (const category of ['disk', 'memory', 'system']) expect(resolveSubcommandAlias(category, 'status')).toBe('info')
  })
})
