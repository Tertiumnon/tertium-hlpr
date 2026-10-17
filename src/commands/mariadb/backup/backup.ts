#!/usr/bin/env node
import path from 'node:path'
import { validateParamName } from '../../../core/aws/param-store.js'
import { type BackupOptions, backupDatabase } from '../../../core/mariadb/backup.js'
import { parseFlags, validateSshConfig } from '../../../core/mariadb/mariadb.js'
import { type SshResolver, resolveSshHost } from '../../../core/ssh/remote.js'

// @description Dump a MariaDB database over SSH into a local .sql file

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr mariadb backup -host <hostname> (-db-url <url> | -ssm-param <name>) [-backup-dir <dir>] [-prefix <name>]'

export function parseBackupArgs(args: string[], resolve: SshResolver = resolveSshHost): BackupOptions {
  const values = parseFlags(args, ['-host', '-db-url', '-ssm-param', '-backup-dir', '-prefix'])
  const host = values['-host']
  if (typeof host !== 'string') throw new Error(USAGE)
  if ((values['-db-url'] === undefined) === (values['-ssm-param'] === undefined)) throw new Error(`${USAGE}\nGive exactly one of -db-url or -ssm-param`)
  const prefix = typeof values['-prefix'] === 'string' ? values['-prefix'] : 'backup'
  if (prefix !== path.basename(prefix) || prefix === '.' || prefix === '..') throw new Error('-prefix must be a file name, not a path')
  const source = typeof values['-db-url'] === 'string' ? values['-db-url'] : `ssm:${validateParamName(String(values['-ssm-param']), '-ssm-param')}`
  return {
    ssh: validateSshConfig(resolve(host), '-host'),
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
