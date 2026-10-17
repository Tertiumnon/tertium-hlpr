import { expect, test } from 'bun:test'
import { parseChangeArgs } from './change.js'

test('requires -default-branch and -to, and rejects unknown options', () => {
  expect(parseChangeArgs(['-default-branch', 'master', '-to', 'main'])).toEqual({ defaultBranch: 'master', to: 'main' })
  expect(() => parseChangeArgs(['-default-branch', 'master'])).toThrow('Usage: hlpr gh change')
  expect(() => parseChangeArgs(['-to', 'main'])).toThrow('Usage: hlpr gh change')
  expect(() => parseChangeArgs(['-default-branch', 'master', '-to', 'master'])).toThrow('must differ')
  expect(() => parseChangeArgs(['-default-branch', 'my branch', '-to', 'main'])).toThrow('cannot contain spaces')
  expect(() => parseChangeArgs(['-default-branch', 'master', '-to', 'main', '-force'])).toThrow('Unknown option -force')
})
