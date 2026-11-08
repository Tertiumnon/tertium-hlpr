import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { parseUnix, summarize } from './status.js'

test('sums matches and nested children once even when names overlap', () => {
  const rows = parseUnix('1 0 10.5 100 /app/browser\n2 1 2.0 50 webview\n3 2 0.5 25 browser-helper\n4 0 3.0 10 other')
  expect(summarize(rows, 'BROWSER')).toEqual({ count: 3, cpu: 13, memory: 175 * 1024 })
  expect(() => summarize(rows, 'missing')).toThrow('No processes match')
})

test('rejects missing counters, invalid output, and invalid CLI arguments', () => {
  expect(() => summarize([{ pid: 1, ppid: 0, name: 'browser', cpu: null as unknown as number, memory: 1 }], 'browser')).toThrow('counters are unavailable')
  expect(() => parseUnix('invalid')).toThrow('Cannot parse')
  const result = spawnSync(process.execPath, [path.join(import.meta.dir, 'status.ts'), '-name'], { encoding: 'utf8' })
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('Usage: hlpr process status -name <name>')
})
