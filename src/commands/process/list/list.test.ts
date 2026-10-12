import { describe, expect, test } from 'bun:test'
import { parseUnixProcesses, parseWindowsProcesses } from './list.js'

describe('process list', () => {
  test('parses Windows tasklist output', () => {
    expect(parseWindowsProcesses('"node.exe","123","Console","1","10,000 K"')).toEqual([{ pid: 123, state: 'RUNNING', command: 'node.exe' }])
  })

  test('parses Unix ps output', () => {
    expect(parseUnixProcesses('  123 S node\n')).toEqual([{ pid: 123, state: 'S', command: 'node' }])
  })
})
