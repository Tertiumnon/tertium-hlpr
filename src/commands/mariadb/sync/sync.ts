#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { backupDatabase, resolveDatabaseUrl } from '../../../core/mariadb/backup.js'
import { validateParamName } from '../../../core/aws/param-store.js'
import {
  CLIENT_CANDIDATES,
  DUMP_CANDIDATES,
  DUMP_FLAGS,
  detectRemoteBinary,
  type DbTarget,
  parseDatabaseUrl,
  parseFlags,
  remoteCommand,
  sq,
  sqlString,
  sshRun,
  validateSshConfig,
} from '../../../core/mariadb/mariadb.js'
import { type SshResolver, resolveSshHost } from '../../../core/ssh/remote.js'

// @description Copy one MariaDB database over another over SSH, backing up the target first

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr mariadb sync -from-host <hostname> (-from-db-url <url> | -from-ssm-param <name>) -to-host <hostname> (-to-db-url <url> | -to-ssm-param <name>) [-dry-run] [-skip-backup] [-backup-dir <dir>]'

interface Side {
  ssh: string
  source: string
}

export interface SyncOptions {
  from: Side
  to: Side
  dryRun: boolean
  skipBackup: boolean
  backupDir: string
}

function parseSide(values: Record<string, string | true>, name: 'from' | 'to', resolve: SshResolver): Side {
  const host = values[`-${name}-host`]
  const url = values[`-${name}-db-url`]
  const ssm = values[`-${name}-ssm-param`]
  if (typeof host !== 'string') throw new Error(USAGE)
  if ((url === undefined) === (ssm === undefined)) throw new Error(`${USAGE}\nGive exactly one of -${name}-db-url or -${name}-ssm-param`)
  const source = typeof url === 'string' ? url : `ssm:${validateParamName(String(ssm), `-${name}-ssm-param`)}`
  return { ssh: validateSshConfig(resolve(host), `-${name}-host`), source }
}

export function parseSyncArgs(args: string[], resolve: SshResolver = resolveSshHost): SyncOptions {
  const values = parseFlags(args, [
    '-from-host', '-from-db-url', '-from-ssm-param',
    '-to-host', '-to-db-url', '-to-ssm-param',
    '-backup-dir',
  ], ['-dry-run', '-skip-backup'])
  const backupDir = typeof values['-backup-dir'] === 'string' ? values['-backup-dir'] : 'backups'
  return {
    from: parseSide(values, 'from', resolve),
    to: parseSide(values, 'to', resolve),
    dryRun: values['-dry-run'] === true,
    skipBackup: values['-skip-backup'] === true,
    backupDir,
  }
}

// information_schema's TABLE_ROWS is an estimate for InnoDB - enough to tell empty from not.
function countRows(target: DbTarget, clientBin: string): number {
  const sql = `SELECT COALESCE(SUM(TABLE_ROWS),0) FROM information_schema.tables WHERE TABLE_SCHEMA=${sqlString(target.database)}`
  const { status, stdout } = sshRun(target.ssh, remoteCommand(target, sq(clientBin), ['-N', '-e', sq(sql)]))
  if (status !== 0) throw new Error(`Could not read ${target.database} on ${target.ssh}`)
  return Number(stdout.trim()) || 0
}

export async function syncDatabase(options: SyncOptions, readSsm?: (name: string) => string): Promise<void> {
  const from = parseDatabaseUrl(resolveDatabaseUrl(options.from.source, readSsm), options.from.ssh)
  const to = parseDatabaseUrl(resolveDatabaseUrl(options.to.source, readSsm), options.to.ssh)
  if (from.ssh === to.ssh && from.host === to.host && from.port === to.port && from.database === to.database) {
    throw new Error(`Source and target are the same database (${to.database} on ${to.ssh})`)
  }

  console.log(`From: ${from.database} on ${from.ssh}`)
  console.log(`To:   ${to.database} on ${to.ssh}`)

  const fromDumpBin = detectRemoteBinary(from.ssh, DUMP_CANDIDATES)
  const fromClientBin = detectRemoteBinary(from.ssh, CLIENT_CANDIDATES)
  const toClientBin = detectRemoteBinary(to.ssh, CLIENT_CANDIDATES)

  const fromRows = countRows(from, fromClientBin)
  const toRows = countRows(to, toClientBin)
  console.log(`${from.database} has ~${fromRows} rows; ${to.database} has ~${toRows} rows, which this sync overwrites`)

  if (options.dryRun) {
    console.log(`Dry run: would dump with ${fromDumpBin} on ${from.ssh} and import with ${toClientBin} on ${to.ssh}`)
    return
  }

  if (options.skipBackup) {
    console.log('Skipping the backup (-skip-backup)')
  } else {
    console.log(`Backing up ${to.database} on ${to.ssh} before overwriting it...`)
    await backupDatabase({
      ssh: options.to.ssh,
      source: resolveDatabaseUrl(options.to.source, readSsm),
      backupDir: options.backupDir,
      prefix: `${to.database}-before-sync`,
    }, readSsm)
  }

  console.log(`Dumping ${from.database} and importing into ${to.database}...`)
  const dump = spawn('ssh', ['-o', 'BatchMode=yes', from.ssh, remoteCommand(from, sq(fromDumpBin), [...DUMP_FLAGS, sq(from.database)])], {
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  const restore = spawn('ssh', ['-o', 'BatchMode=yes', to.ssh, remoteCommand(to, sq(toClientBin), [sq(to.database)])], {
    stdio: ['pipe', 'inherit', 'inherit'],
  })
  if (!dump.stdout || !restore.stdin) throw new Error('Could not open the sync pipe')
  dump.stdout.pipe(restore.stdin)
  const [dumpExit, restoreExit] = await Promise.all([waitForExit(dump), waitForExit(restore)])
  if (dumpExit !== 0 || restoreExit !== 0) throw new Error(`Sync failed (dump exit ${dumpExit}, import exit ${restoreExit})`)
  console.log(`✓ ${from.database} copied to ${to.database}`)
}

function waitForExit(proc: ReturnType<typeof spawn>): Promise<number> {
  return new Promise((resolve, reject) => {
    proc.on('error', reject)
    proc.on('close', code => resolve(code ?? 1))
  })
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nCopies the source database over the target, with no file in between. The target is backed up first into <backup-dir>/<database>-before-sync_<timestamp>.sql. It overwrites the target without asking: run -dry-run first.`)
    return
  }
  await syncDatabase(parseSyncArgs(args))
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
