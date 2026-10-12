#!/usr/bin/env node
import os from 'node:os'

// @description Show active network interfaces and their IP addresses

export function networkStatus(): [string, string][] {
  return Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) => {
    const ips = addresses?.map(({ address, family, cidr, internal }) => `${internal ? 'loopback' : family} ${cidr ?? address}`) ?? []
    return ips.length ? [[name, ips.join(', ')]] : []
  })
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr net status')
    console.log('Show active network interfaces and their IP addresses.')
    process.exit(0)
  }
  if (args.length) {
    console.error('Usage: hlpr net status')
    process.exit(1)
  }
  const interfaces = networkStatus()
  console.log(interfaces.length ? interfaces.map(([name, addresses]) => `${name} | ${addresses}`).join('\n') : 'No active network interfaces found.')
}
