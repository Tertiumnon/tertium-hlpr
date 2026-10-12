#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { formatBytes, formatInfo, powershellJson } from '../../../core/command/system.js'

// @description Show mounted volume capacity and available space

export interface DiskInfo {
  name: string
  mount: string
  total: number
  used: number
  free: number
}

export function parseDf(output: string): DiskInfo[] {
  return output.split(/\r?\n/).slice(1).filter(line => line.trim()).map(line => {
    const match = line.match(/^(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+\d+%\s+(.+)$/)
    if (!match) throw new Error(`Unrecognized df output: ${line}`)
    return { name: match[1].trim(), mount: match[5], total: Number(match[2]) * 1024, used: Number(match[3]) * 1024, free: Number(match[4]) * 1024 }
  }).filter(disk => disk.total > 0)
}

export function diskInfo(): DiskInfo[] {
  if (process.platform === 'win32') {
    const disks = powershellJson<Array<{ DeviceID: string; VolumeName: string | null; FileSystem: string; Size: number; FreeSpace: number }>>(
      `,@(Get-CimInstance Win32_LogicalDisk | Where-Object { $_.Size -gt 0 } | Select-Object DeviceID,VolumeName,FileSystem,Size,FreeSpace)`)
    return disks.map(disk => ({ name: [disk.VolumeName, disk.FileSystem].filter(Boolean).join(' - ') || disk.DeviceID,
      mount: disk.DeviceID, total: disk.Size, used: disk.Size - disk.FreeSpace, free: disk.FreeSpace }))
  }
  if (process.platform !== 'linux' && process.platform !== 'darwin') throw new Error(`Disk info is not supported on ${process.platform}`)
  return parseDf(execFileSync('df', ['-kP'], { encoding: 'utf8', timeout: 20_000, env: { ...process.env, LC_ALL: 'C' } }))
}

export function formatDisks(disks: DiskInfo[]): string {
  if (!disks.length) return 'No mounted volumes found.'
  return disks.map(disk => {
    const fraction = disk.total > 0 ? Math.max(0, Math.min(1, disk.used / disk.total)) : 0
    const filled = Math.round(fraction * 20)
    return `${disk.mount} (${disk.name})\n[${'#'.repeat(filled)}${'-'.repeat(20 - filled)}] ${(fraction * 100).toFixed(1)}% used\n${formatInfo([
      ['Total', formatBytes(disk.total)], ['Used', formatBytes(disk.used)], ['Available', formatBytes(disk.free)],
    ])}`
  }).join('\n\n')
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr disk info')
    console.log('Show mounted volumes vertically, with usage bars and total, used, and available space.')
    process.exit(0)
  }
  if (args.length) {
    console.error('Usage: hlpr disk info')
    process.exit(1)
  }
  try {
    console.log(formatDisks(diskInfo()))
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}
