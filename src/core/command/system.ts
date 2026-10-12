import { execFileSync } from 'node:child_process'

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unavailable'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  const index = bytes === 0 ? 0 : Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatInfo(rows: [string, string][]): string {
  const width = Math.max(0, ...rows.map(([label]) => label.length))
  return rows.map(([label, value]) => `${label.padEnd(width)} | ${value || 'Unavailable'}`).join('\n')
}

export function powershellJson<T>(script: string): T {
  return JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $ErrorActionPreference = 'Stop'; $result = & { ${script} }; ConvertTo-Json -InputObject $result -Compress -Depth 4`,
  ], { encoding: 'utf8', timeout: 20_000, windowsHide: true }).replace(/^\uFEFF/, '')) as T
}
