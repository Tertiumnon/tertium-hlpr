#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { basename } from 'node:path'

// @description Summarize CPU and memory usage of matching processes and their descendants

interface ProcessUsage {
  pid: number
  ppid: number
  name: string
  cpu: number
  memory: number
}

export const summarize = (rows: ProcessUsage[], name: string): { count: number; cpu: number; memory: number } => {
  const selected = new Set(rows.filter(row => basename(row.name).toLowerCase().includes(name.toLowerCase())).map(row => row.pid))
  if (selected.size === 0) throw new Error(`No processes match "${name}"; check the process name`)
  const children = new Map<number, number[]>()
  for (const row of rows) children.set(row.ppid, [...(children.get(row.ppid) ?? []), row.pid])
  const pending = [...selected]
  while (pending.length) {
    for (const pid of children.get(pending.pop() as number) ?? []) {
      if (!selected.has(pid)) { selected.add(pid); pending.push(pid) }
    }
  }
  return rows.filter(row => selected.has(row.pid)).reduce((total, row) => {
    if (typeof row.cpu !== 'number' || typeof row.memory !== 'number') throw new Error('Process usage counters are unavailable; retry the command')
    return { count: total.count + 1, cpu: total.cpu + row.cpu, memory: total.memory + row.memory }
  }, { count: 0, cpu: 0, memory: 0 })
}

export const parseUnix = (output: string): ProcessUsage[] => output.trim().split(/\r?\n/).map(line => {
  const match = line.match(/^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(.+)$/)
  if (!match) throw new Error('Cannot parse process information from ps')
  return { pid: Number(match[1]), ppid: Number(match[2]), cpu: Number(match[3]), memory: Number(match[4]) * 1024, name: match[5] }
})

const list = (): ProcessUsage[] => {
  if (process.platform !== 'win32') return parseUnix(execFileSync('ps', ['-eo', 'pid=,ppid=,pcpu=,rss=,comm='], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
  const script = `$ErrorActionPreference = 'Stop'; $processes = @(Get-CimInstance Win32_Process); $perf = @{}; Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | ForEach-Object { $perf[[int]$_.IDProcess] = $_.PercentProcessorTime }; $rows = @($processes | ForEach-Object { @{ pid = $_.ProcessId; ppid = $_.ParentProcessId; name = $_.Name; cpu = $perf[[int]$_.ProcessId]; memory = $_.WorkingSetSize } }); ConvertTo-Json -InputObject $rows -Compress`
  return JSON.parse(execFileSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })) as ProcessUsage[]
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr process status -name <name>')
    console.log('Alias: hlpr process info -name <name>')
    console.log('Summarize CPU and resident memory for matching processes and their descendants.')
  } else {
    try {
      if (args.length !== 2 || args[0] !== '-name' || !args[1] || args[1].startsWith('-')) throw new Error('Usage: hlpr process status -name <name>')
      const rows = list()
      const result = summarize(rows, args[1])
      console.log(`Processes: ${result.count}\nCPU: ${result.cpu.toFixed(1)}%\nMemory: ${(result.memory / 1024 / 1024).toFixed(1)} MiB`)
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`)
      process.exitCode = 1
    }
  }
}
