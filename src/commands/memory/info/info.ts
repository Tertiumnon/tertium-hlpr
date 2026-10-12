#!/usr/bin/env node
import os from 'node:os'
import { formatBytes, formatInfo } from '../../../core/command/system.js'

// @description Show total, used, and free physical memory

export function memoryInfo(): [string, string][] {
  const total = os.totalmem()
  const free = os.freemem()
  return [['Total', formatBytes(total)], ['Used', formatBytes(total - free)], ['Free', formatBytes(free)]]
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr memory info')
    console.log('Show total, used, and free physical memory.')
    process.exit(0)
  }
  if (args.length) {
    console.error('Usage: hlpr memory info')
    process.exit(1)
  }
  console.log(formatInfo(memoryInfo()))
}
