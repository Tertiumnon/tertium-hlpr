import { spawn } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, statSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { readSsmParameter } from '../aws/param-store.js'
import { DUMP_CANDIDATES, DUMP_FLAGS, detectRemoteBinary, parseDatabaseUrl, readDatabaseUrl, remoteCommand, sq } from './mariadb.js'

// Shared by `mariadb backup` and `mariadb sync` (which backs the target up before overwriting it).

export interface BackupOptions {
  ssh: string
  /** A DATABASE_URL, or `ssm:<parameter name>` to read it from SSM. */
  source: string
  backupDir: string
  prefix: string
}

// The URL comes from the flag, or from the SSM parameter read in memory (`ssm:<name>` marks it).
export function resolveDatabaseUrl(source: string, readSsm: (name: string) => string = readSsmParameter): string {
  return source.startsWith('ssm:') ? readDatabaseUrl(readSsm(source.slice(4))) : source
}

/** Dumps the database on the SSH host and returns the local file. Empty and partial files are removed. */
export async function backupDatabase(options: BackupOptions, readSsm?: (name: string) => string): Promise<string> {
  const target = parseDatabaseUrl(resolveDatabaseUrl(options.source, readSsm), options.ssh)
  const dumpBin = detectRemoteBinary(options.ssh, DUMP_CANDIDATES)
  const backupDir = path.resolve(options.backupDir)
  mkdirSync(backupDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const file = path.join(backupDir, `${options.prefix}_${timestamp}.sql`)

  console.log(`Backing up ${target.database} through ${target.ssh}...`)
  const command = remoteCommand(target, sq(dumpBin), [...DUMP_FLAGS, sq(target.database)])
  const fd = openSync(file, 'w')
  try {
    const code = await new Promise<number>((resolve, reject) => {
      const proc = spawn('ssh', ['-o', 'BatchMode=yes', target.ssh, command], { stdio: ['ignore', fd, 'inherit'] })
      proc.on('error', reject)
      proc.on('close', exit => resolve(exit ?? 1))
    })
    if (code !== 0) throw new Error(`Database backup failed (exit ${code})`)
  } catch (error) {
    closeSync(fd)
    if (existsSync(file)) unlinkSync(file)
    throw error
  }
  closeSync(fd)

  const bytes = statSync(file).size
  if (bytes === 0) {
    unlinkSync(file)
    throw new Error('Database backup produced an empty file')
  }
  console.log(`✓ Backup saved: ${file} (${(bytes / 1024 / 1024).toFixed(2)} MB)`)
  return file
}
