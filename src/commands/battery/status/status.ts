#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { powershellJson } from '../../../core/command/system.js'

// @description Show battery charge and status

export function batteryStatus(): [string, string][] {
  if (process.platform === 'win32') {
    const battery = powershellJson<{ Name: string; EstimatedChargeRemaining: number; BatteryStatus: number }[]>(
      `,@(Get-CimInstance Win32_Battery | Select-Object Name,EstimatedChargeRemaining,BatteryStatus)`)
    return battery.flatMap(item => [
      ['Battery', item.Name || 'Battery'],
      ['Charge', `${item.EstimatedChargeRemaining}%`],
      ['Status', ({ 1: 'Discharging', 2: 'AC connected', 3: 'Fully charged', 4: 'Low', 5: 'Critical', 6: 'Charging' } as Record<number, string>)[item.BatteryStatus] ?? 'Unknown'],
    ])
  }
  if (process.platform === 'linux') {
    let batteries: string[]
    try { batteries = readdirSync('/sys/class/power_supply').filter(name => name.startsWith('BAT')) }
    catch { return [] }
    return batteries.flatMap(name => {
      const root = `/sys/class/power_supply/${name}`
      try {
        return [['Battery', name], ['Charge', `${readFileSync(`${root}/capacity`, 'utf8').trim()}%`], ['Status', readFileSync(`${root}/status`, 'utf8').trim()]] as [string, string][]
      } catch { return [] }
    })
  }
  if (process.platform === 'darwin') {
    try {
      const output = execFileSync('pmset', ['-g', 'batt'], { encoding: 'utf8', timeout: 5000 })
      const match = output.match(/(\d+)%.*?;(.*)/)
      return match ? [['Charge', `${match[1]}%`], ['Status', match[2].trim()]] : []
    } catch { return [] }
  }
  return []
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr battery status')
    console.log('Show battery charge and charging status.')
    process.exit(0)
  }
  if (args.length) {
    console.error('Usage: hlpr battery status')
    process.exit(1)
  }
  const rows = batteryStatus()
  console.log(rows.length ? rows.map(([label, value]) => `${label} | ${value}`).join('\n') : 'No battery detected.')
}
