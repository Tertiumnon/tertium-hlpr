import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { knownSections, parseLinuxDisks, parsePhysicalCores, systemInfo } from './info.js'

test('keeps only reported fields and sections on Linux', () => {
  expect(knownSections({ CPU: { Name: 'Ryzen', 'Physical cores': 'Unavailable' }, RAM: { Slots: '0', Modules: 'Unavailable' }, GPU: { Name: 'Unavailable' } })).toEqual({ CPU: { Name: 'Ryzen' } })
  expect(parsePhysicalCores('# CPU,Core,Socket\n0,0\n0,0\n1,0\n1,0\n')).toBe(2)
  expect(parseLinuxDisks('{"blockdevices":[{"name":"sda","model":"Fast SSD","size":"1T","type":"disk"},{"name":"sda1","size":"1T","type":"part"}]}')).toBe('Fast SSD\t1T')
})

test('reports core system information', () => {
  const rows = systemInfo()
  expect(rows.find(([label]) => label === 'Hostname')?.[1]).toBeTruthy()
  if (process.platform === 'win32') expect(rows.find(([label]) => label === 'CPU socket')?.[1]).toBeTruthy()
  expect(rows.some(([label, value]) => label === 'OS' && value === '')).toBe(true)
  expect(rows.find(([label]) => label === 'Total')).toBeUndefined()
  expect(Number(rows.find(([label]) => label === 'Logical CPUs')?.[1])).toBeGreaterThan(0)
  expect(rows.find(([label]) => label === 'Name')?.[1]).toBeTruthy()
  expect(rows.some(([label]) => label === 'Modules')).toBe(false)
  if (process.platform === 'win32') expect(rows.some(([label]) => label.toLowerCase().includes('slot'))).toBe(true)
  expect(rows.some(([label]) => label === 'Manufacturer')).toBe(true)
  if (process.platform === 'win32') {
    expect(rows.some(([label]) => label === 'Type')).toBe(true)
    expect(rows.some(([label]) => label === 'VRAM')).toBe(true)
    expect(rows.some(([label]) => label === 'Physical')).toBe(true)
    expect(rows.some(([label]) => label === 'Disks')).toBe(true)
  }
  const headings = rows.filter(([, value]) => value === '').map(([label]) => label)
  if (process.platform === 'win32') expect(headings).toEqual(['M/B', 'BIOS', 'Expansion', 'CPU', 'RAM', 'GPU', 'Disks', 'OS', 'Uptime'])
  else expect(headings).toContain('CPU')
  if (process.platform === 'win32') {
    expect(rows.some(([label]) => label === 'SATA connections')).toBe(true)
    expect(rows.some(([label]) => label === 'M.2/NVMe')).toBe(true)
  }
}, 30_000)

test.each(['system', 'disk', 'memory'])('%s info supports help and rejects unexpected arguments', command => {
  const script = fileURLToPath(new URL(`../../${command}/info/info.ts`, import.meta.url))
  const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' })
  expect(help.status).toBe(0)
  expect(help.stdout).toContain(`Usage: hlpr ${command} info`)
  const invalid = spawnSync(process.execPath, [script, '--unknown'], { encoding: 'utf8' })
  expect(invalid.status).toBe(1)
  expect(invalid.stderr).toContain(`Usage: hlpr ${command} info`)
})
