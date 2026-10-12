import { expect, test } from 'bun:test'
import { formatBytes, formatInfo, powershellJson } from './system.js'

test('formats byte quantities and unavailable values', () => {
  expect(formatBytes(0)).toBe('0 B')
  expect(formatBytes(1024 ** 3 * 1.5)).toBe('1.5 GiB')
  expect(formatBytes(-1)).toBe('Unavailable')
  expect(formatBytes(Number.NaN)).toBe('Unavailable')
  expect(formatInfo([['CPU', 'Example'], ['RAM total', '16.0 GiB']])).toBe('CPU       | Example\nRAM total | 16.0 GiB')
})

test.skipIf(process.platform !== 'win32')('PowerShell preserves single-item and empty disk arrays', () => {
  expect(powershellJson<number[]>(',@(1)')).toEqual([1])
  expect(powershellJson<number[]>(',@()')).toEqual([])
}, 30_000)
