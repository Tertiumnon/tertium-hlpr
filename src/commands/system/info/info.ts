#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import os from 'node:os'
import { formatBytes, formatInfo, powershellJson } from '../../../core/command/system.js'

// @description Show hardware, operating system, memory, and network information

function hardwareInfo(): [string, string][] {
  if (process.platform === 'win32') {
    const info = powershellJson<Record<string, string>>(`
      $computer = Get-CimInstance Win32_ComputerSystem;
      $board = Get-CimInstance Win32_BaseBoard;
      $bios = Get-CimInstance Win32_BIOS;
      $cpu = Get-CimInstance Win32_Processor;
      $gpu = Get-CimInstance Win32_VideoController;
      $os = Get-CimInstance Win32_OperatingSystem;
      [ordered]@{
        'OS edition' = $os.Caption;
        'Manufacturer' = $computer.Manufacturer;
        'Model' = $computer.Model;
        'Motherboard' = (($board | ForEach-Object { "$($_.Manufacturer) $($_.Product)" }) -join ', ');
        'BIOS' = "$($bios.Manufacturer) $($bios.SMBIOSBIOSVersion)";
        'CPU cores' = [string](($cpu | Measure-Object NumberOfCores -Sum).Sum);
        'GPU' = (($gpu | ForEach-Object { $_.Name }) -join ', ')
      }`)
    return Object.entries(info)
  }
  if (process.platform === 'linux') {
    return [['Manufacturer', 'sys_vendor'], ['Model', 'product_name'], ['Motherboard', 'board_name'], ['BIOS', 'bios_version']].map(([label, file]) => {
      try {
        return [label, readFileSync(`/sys/class/dmi/id/${file}`, 'utf8').trim()]
      } catch {
        return [label, 'Unavailable']
      }
    })
  }
  if (process.platform === 'darwin') {
    return [['Model', execFileSync('sysctl', ['-n', 'hw.model'], { encoding: 'utf8', timeout: 5000 }).trim()]]
  }
  return [['Hardware details', 'Unavailable on this platform']]
}

export function systemInfo(): [string, string][] {
  const cpus = os.cpus()
  const total = os.totalmem()
  const free = os.freemem()
  const minutes = Math.floor(os.uptime() / 60)
  const rows: [string, string][] = [
    ['Hostname', os.hostname()],
    ['OS', `${os.type()} ${os.release()}`],
    ['Architecture', os.arch()],
    ['CPU', [...new Set(cpus.map(cpu => cpu.model.trim()))].join(', ')],
    ['Logical CPUs', String(cpus.length)],
    ['RAM total', formatBytes(total)],
    ['RAM used', formatBytes(total - free)],
    ['RAM free', formatBytes(free)],
    ['Uptime', `${Math.floor(minutes / 1440)}d ${Math.floor(minutes / 60) % 24}h ${minutes % 60}m`],
  ]
  try {
    rows.push(...hardwareInfo())
  } catch {
    rows.push(['Hardware details', 'Unavailable (system query failed)'])
  }
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    const ips = addresses?.filter(address => !address.internal).map(address => address.address)
    if (ips?.length) rows.push([`Network (${name})`, ips.join(', ')])
  }
  return rows
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr system info')
    console.log('Show CPU, RAM, OS, uptime, network addresses, and available hardware details.')
    process.exit(0)
  }
  if (args.length) {
    console.error('Usage: hlpr system info')
    process.exit(1)
  }
  try {
    console.log(formatInfo(systemInfo()))
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}
