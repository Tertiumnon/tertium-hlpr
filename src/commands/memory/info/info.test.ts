import { expect, test } from 'bun:test'
import os from 'node:os'
import { memoryInfo } from './info.js'

test('reports total, used, and free system memory', () => {
  const memory = Object.fromEntries(memoryInfo())
  expect(memory.Total).toBeTruthy()
  expect(memory.Used).toBeTruthy()
  expect(memory.Free).toBeTruthy()
  expect(memory.Total).toBe(`${(os.totalmem() / 1024 ** 3).toFixed(1)} GiB`)
})
