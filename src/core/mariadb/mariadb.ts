import { spawnSync } from 'node:child_process'

// Shared by `mariadb backup`, `mariadb sync` and `mariadb set-user-password`: parse flags, read a
// DATABASE_URL, and run the MariaDB client on a host over SSH.

// A non-interactive SSH session on macOS often lacks Homebrew's bin on PATH, so its keg paths are probed
// by absolute path after the plain names.
export const DUMP_CANDIDATES = [
  'mariadb-dump',
  'mysqldump',
  '/opt/homebrew/opt/mariadb/bin/mariadb-dump',
  '/usr/local/opt/mariadb/bin/mariadb-dump',
  '/opt/homebrew/opt/mysql/bin/mysqldump',
  '/usr/local/opt/mysql/bin/mysqldump',
]

export const CLIENT_CANDIDATES = [
  'mariadb',
  'mysql',
  '/opt/homebrew/opt/mariadb/bin/mariadb',
  '/usr/local/opt/mariadb/bin/mariadb',
  '/opt/homebrew/opt/mysql/bin/mysql',
  '/usr/local/opt/mysql/bin/mysql',
]

// A consistent InnoDB snapshot without locking the source, with routines and triggers.
export const DUMP_FLAGS = ['--single-transaction', '--routines', '--triggers']

export interface DbTarget {
  ssh: string
  host: string
  port: string
  user: string
  password: string
  database: string
}

export { parseFlags } from '../args.js'

// Single-quoted shell word for the remote POSIX shell that ssh hands the command string to.
export function sq(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`
}

// Single-quoted SQL string literal. Backslashes are doubled because MariaDB treats them as escapes.
export function sqlString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
}


export function parseDatabaseUrl(databaseUrl: string, ssh: string): DbTarget {
  let url: URL
  try {
    url = new URL(databaseUrl)
  } catch {
    throw new Error('DATABASE_URL is not a valid URL')
  }
  if (!/^(mysql|mariadb):$/.test(url.protocol)) throw new Error(`DATABASE_URL must be mysql:// or mariadb:// (got ${url.protocol}//)`)
  const database = decodeURIComponent(url.pathname.slice(1))
  if (!database) throw new Error('DATABASE_URL names no database')
  return {
    ssh,
    // Kept as written: a user may be granted only from that address, not from localhost.
    host: url.hostname,
    port: url.port || '3306',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  }
}

// Reads DATABASE_URL from a KEY=VALUE env file's content (the format `/env/<app>/env.dev` parameters use).
export function readDatabaseUrl(envContent: string): string {
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*?)\s*$/)
    if (match) return match[1].replace(/^(['"])(.*)\1$/, '$2')
  }
  throw new Error('DATABASE_URL is not set in the parameter')
}

// The password goes in MYSQL_PWD (read by both the mysql and mariadb clients), so it never shows in the
// remote host's process list the way `-p<password>` would.
export function remoteCommand(target: DbTarget, bin: string, args: string[]): string {
  return [`MYSQL_PWD=${sq(target.password)}`, bin, `-h ${sq(target.host)}`, `-P ${sq(target.port)}`, `-u ${sq(target.user)}`, ...args].join(' ')
}

export function sshRun(ssh: string, command: string): { status: number, stdout: string } {
  const proc = spawnSync('ssh', ['-o', 'BatchMode=yes', ssh, command], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  return { status: proc.status ?? 1, stdout: proc.stdout ?? '' }
}

export function detectRemoteBinary(ssh: string, candidates: string[]): string {
  const probe = candidates.map(candidate => `command -v ${candidate}`).join(' || ')
  const { status, stdout } = sshRun(ssh, probe)
  const found = stdout.trim().split('\n')[0]
  if (status !== 0 || !found) throw new Error(`None of ${candidates.join(', ')} was found on ${ssh}`)
  return found
}
