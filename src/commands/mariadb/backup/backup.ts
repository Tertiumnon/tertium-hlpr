#!/usr/bin/env node
import path from 'node:path'
import { validateParamName } from '../../../core/aws/param-store.js'
import { type BackupOptions, backupDatabase } from '../../../core/mariadb/backup.js'
import { parseFlags } from '../../../core/mariadb/mariadb.js'
import { type DestinationDeps, destinationFor, sshTargetFromFlags } from '../../../core/ssh/destination.js'

// @description Dump a MariaDB database over SSH into a local .sql file

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr mariadb backup [-ssh-host <host>] [-ssh-user <user>] [-ssm-param <name>] (-db-url <url> | -ssm-param <name>) [-backup-dir <dir>] [-prefix <name>]'

export function parseBackupArgs(args: string[], deps: DestinationDeps = {}): BackupOptions {
  const values = parseFlags(args, ['-ssh-host', '-ssh-user', '-db-url', '-ssm-param', '-backup-dir', '-prefix'])
  const ssmParam = typeof values['-ssm-param'] === 'string' ? values['-ssm-param'] : undefined
  if (values['-db-url'] === undefined && ssmParam === undefined) throw new Error(USAGE)
  if ((values['-db-url'] === undefined) === (ssmParam === undefined)) throw new Error(`${USAGE}\nGive exactly one of -db-url or -ssm-param`)
  const prefix = typeof values['-prefix'] === 'string' ? values['-prefix'] : 'backup'
  if (prefix !== path.basename(prefix) || prefix === '.' || prefix === '..') throw new Error('-prefix must be a file name, not a path')
  const source = typeof values['-db-url'] === 'string' ? values['-db-url'] : `ssm:${validateParamName(String(ssmParam), '-ssm-param')}`
  return {
    ssh: destinationFor(sshTargetFromFlags(values), deps),
    source,
    backupDir: typeof values['-backup-dir'] === 'string' ? values['-backup-dir'] : 'backups',
    prefix,
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nDumps the database with mariadb-dump (or mysqldump) on the SSH host, with routines and triggers. The password goes through MYSQL_PWD. -ssm-param reads DATABASE_URL from the SSM parameter in memory.`)
    return
  }
  await backupDatabase(parseBackupArgs(args))
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
