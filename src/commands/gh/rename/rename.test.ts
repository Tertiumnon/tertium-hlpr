import { expect, test } from 'bun:test'
import { parseRenameArgs } from './rename.js'

test('requires -repo as OWNER/REPO and -to as a bare new name', () => {
  expect(parseRenameArgs(['-repo', 'tertiumnon/old-name', '-to', 'new-name'])).toEqual({ repo: 'tertiumnon/old-name', to: 'new-name' })
  expect(() => parseRenameArgs(['-repo', 'old-name', '-to', 'new-name'])).toThrow('-repo must be OWNER/REPO')
  expect(() => parseRenameArgs(['-repo', 'a/b', '-to', 'owner/new'])).toThrow('without an owner')
  expect(() => parseRenameArgs(['-repo', 'a/b'])).toThrow('Usage: hlpr gh rename')
  expect(() => parseRenameArgs(['-to', 'x'])).toThrow('Usage: hlpr gh rename')
  expect(() => parseRenameArgs(['-repo', 'a/b', '-to', 'x', '-force'])).toThrow('Unknown option -force')
})
