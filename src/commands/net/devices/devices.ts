#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { isIPv4 } from 'node:net'

// @description List known local-network device IPv4 addresses

export function devicesCommand(platform: NodeJS.Platform): { command: string; args: string[] } {
  if (platform === 'win32') return { command: 'arp', args: ['-a'] }
  if (platform === 'darwin') return { command: 'arp', args: ['-an'] }
  if (platform === 'linux') return { command: 'ip', args: ['-4', 'neigh', 'show'] }
  throw new Error(`Device listing is not supported on ${platform}`)
}

export function parseDeviceIps(output: string): string[] {
  const ips = new Set<string>()
  for (const line of output.split(/\r?\n/)) {
    const ip = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)?.[0]
    const mac = line.match(/\b[\da-f]{1,2}(?:[:-][\da-f]{1,2}){5}\b/i)?.[0]
    if (!ip || !isIPv4(ip) || !mac || /\b(FAILED|INCOMPLETE)\b/.test(line)) continue
    const firstOctet = Number(ip.split('.')[0])
    const bytes = mac.split(/[:-]/).map(byte => Number.parseInt(byte, 16))
    if (firstOctet === 0 || firstOctet === 127 || firstOctet >= 224 || (bytes[0] & 1) || bytes.every(byte => byte === 0)) continue
    ips.add(ip)
  }
  return [...ips].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log('Usage: hlpr net devices')
    console.log('List known local-network device IPv4 addresses, one per line.')
    console.log('Reads the neighbor cache; devices not yet contacted may be missing, and cached devices may be offline.')
    process.exit(0)
  }
  if (args.length > 0) {
    console.error('Usage: hlpr net devices')
    process.exit(1)
  }

  try {
    const { command, args: commandArgs } = devicesCommand(process.platform)
    const result = spawnSync(command, commandArgs, { encoding: 'utf8' })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(result.stderr.trim() || `${command} failed with exit code ${result.status}`)
    const ips = parseDeviceIps(result.stdout)
    console.log(ips.length ? ips.join('\n') : 'No known devices found.')
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}
