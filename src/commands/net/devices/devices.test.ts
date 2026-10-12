import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { devicesCommand, parseDeviceIps } from './devices.js'

describe('net devices', () => {
  test('selects the native IPv4 neighbor listing', () => {
    expect(devicesCommand('win32')).toEqual({ command: 'arp', args: ['-a'] })
    expect(devicesCommand('darwin')).toEqual({ command: 'arp', args: ['-an'] })
    expect(devicesCommand('linux')).toEqual({ command: 'ip', args: ['-4', 'neigh', 'show'] })
    expect(() => devicesCommand('freebsd')).toThrow('not supported')
  })

  test('reads Windows entries, deduplicates and sorts IPs, and excludes broadcast/multicast', () => {
    expect(parseDeviceIps(`
Interface: 192.168.1.5 --- 0x12
  Internet Address      Physical Address      Type
  192.168.1.10          30-13-8b-df-48-48     dynamic
  192.168.1.2           f0-2f-74-e9-31-08     static
  192.168.1.10          30-13-8b-df-48-48     dynamic
  192.168.1.255         ff-ff-ff-ff-ff-ff     static
  224.0.0.251           01-00-5e-00-00-fb     static
  255.255.255.255       ff-ff-ff-ff-ff-ff     static
`)).toEqual(['192.168.1.2', '192.168.1.10'])
  })

  test('reads macOS and Linux entries, excluding unresolved and invalid neighbors', () => {
    expect(parseDeviceIps(`
? (192.168.1.1) at a:b:c:d:e:f on en0 ifscope [ethernet]
? (192.168.1.3) at (incomplete) on en0 ifscope [ethernet]
192.168.1.4 dev eth0 lladdr 02:11:22:33:44:55 STALE
192.168.1.6 dev eth0 FAILED
192.168.1.7 dev eth0 lladdr 00:00:00:00:00:00 INCOMPLETE
999.168.1.8 dev eth0 lladdr 02:11:22:33:44:55 REACHABLE
`)).toEqual(['192.168.1.1', '192.168.1.4'])
    expect(parseDeviceIps('')).toEqual([])
  })

  test('shows help and rejects unexpected arguments', () => {
    const script = fileURLToPath(new URL('devices.ts', import.meta.url))
    const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' })
    expect(help.status).toBe(0)
    expect(help.stdout).toContain('Usage: hlpr net devices')
    const invalid = spawnSync(process.execPath, [script, 'example.com'], { encoding: 'utf8' })
    expect(invalid.status).toBe(1)
    expect(invalid.stderr).toContain('Usage: hlpr net devices')
  })
})
