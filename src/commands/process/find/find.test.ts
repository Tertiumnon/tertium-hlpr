import { expect, test } from 'bun:test'
import { findProcesses, parseTarget } from './find.js'

const processes = [
  { pid: 12, state: 'S', command: '/usr/bin/node' },
  { pid: 123, state: 'R', command: 'node-helper' },
  { pid: 456, state: 'S', command: 'other' },
]

test('finds names case-insensitively and IDs exactly', () => {
  expect(findProcesses(processes, parseTarget(['-name', 'NODE']))).toEqual(processes.slice(0, 2))
  expect(findProcesses(processes, parseTarget(['-id', '12']))).toEqual([processes[0]])
  expect(() => findProcesses(processes, parseTarget(['-id', '13']))).toThrow('No processes match')
})

test('rejects invalid or conflicting arguments', () => {
  for (const args of [[], ['-name'], ['-name', 'node', '-id', '12'], ['-id', '0'], ['-id', '12x']]) {
    expect(() => parseTarget(args)).toThrow()
  }
})
