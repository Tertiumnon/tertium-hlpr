import { execFileSync } from 'node:child_process'

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unavailable'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  const index = bytes === 0 ? 0 : Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatInfo(rows: [string, string][], color = process.stdout.isTTY && process.env.NO_COLOR === undefined && process.env.TERM !== 'dumb'): string {
  const width = Math.max(0, ...rows.filter(([, value]) => value !== '').map(([label]) => label.length))
  const paint = (code: number, value: string) => color ? `\x1b[${code}m${value}\x1b[0m` : value
  return rows.map(([label, value]) => value === ''
    ? paint(1, `--- ${label} ---`)
    : `${paint(36, label.padEnd(width))} ${paint(90, '|')} ${value || 'Unavailable'}`).join('\n')
}

export function powershellJson<T>(script: string): T {
  return JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $ErrorActionPreference = 'Stop'; $result = & { ${script} }; ConvertTo-Json -InputObject $result -Compress -Depth 4`,
  ], { encoding: 'utf8', timeout: 20_000, windowsHide: true }).replace(/^\uFEFF/, '')) as T
}
