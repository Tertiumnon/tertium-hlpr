import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { systemInfo } from './info.js'

test('reports core system information', () => {
  const rows = Object.fromEntries(systemInfo())
  expect(rows.Hostname).toBeTruthy()
  expect(rows.OS).toBeTruthy()
  expect(rows['RAM total']).not.toBe('Unavailable')
  expect(Number(rows['Logical CPUs'])).toBeGreaterThan(0)
  expect(rows.Uptime).toMatch(/^\d+d \d+h \d+m$/)
}, 30_000)

test.each(['system', 'disk'])('%s info supports help and rejects unexpected arguments', command => {
  const script = fileURLToPath(new URL(`../../${command}/info/info.ts`, import.meta.url))
  const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' })
  expect(help.status).toBe(0)
  expect(help.stdout).toContain(`Usage: hlpr ${command} info`)
  const invalid = spawnSync(process.execPath, [script, '--unknown'], { encoding: 'utf8' })
  expect(invalid.status).toBe(1)
  expect(invalid.stderr).toContain(`Usage: hlpr ${command} info`)
})
