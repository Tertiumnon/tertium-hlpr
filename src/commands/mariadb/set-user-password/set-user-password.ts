#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { validateSshConfig } from '../../../core/mariadb/mariadb.js'
import { setUserPassword } from '../../../core/mariadb/users.js'
import { type SshResolver, resolveSshHost } from '../../../core/ssh/remote.js'

// @description Set a MariaDB user's password on a remote host over SSH

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr mariadb set-user-password -db-name <name> [-db-password <password>] -host <hostname>'

export interface UserPasswordArgs {
  dbName: string
  /** Absent when the password is read from stdin, so it stays off the command line. */
  dbPassword?: string
  sshConfig: string
}

export function parseUserPasswordArgs(args: string[], resolve: SshResolver = resolveSshHost): UserPasswordArgs {
  const values: Record<string, string> = {}
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (!['-db-name', '-db-password', '-host'].includes(arg) || values[arg] !== undefined) throw new Error(USAGE)
    const value = args[index + 1]
    if (value === undefined || value.startsWith('-') && arg !== '-db-password') throw new Error(USAGE)
    values[arg] = value
    index++
  }
  const dbName = values['-db-name']
  const host = values['-host']
  if (!dbName || !host) throw new Error(USAGE)
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error('Invalid -db-name: use letters, digits and underscores')
  const dbPassword = values['-db-password']
  if (dbPassword !== undefined && (dbPassword === '' || /[\r\n\0]/.test(dbPassword))) throw new Error('Invalid -db-password: it must not be empty or contain line breaks')
  return { dbName, dbPassword, sshConfig: validateSshConfig(resolve(host), '-host') }
}

// The password from stdin: one line, without its line break.
export function readPasswordFromStdin(): string {
  if (process.stdin.isTTY) throw new Error('No -db-password given: pipe the password on stdin, or pass -db-password')
  const password = readFileSync(0, 'utf-8').replace(/\r?\n$/, '')
  if (password === '' || /[\r\n\0]/.test(password)) throw new Error('Invalid password on stdin: it must not be empty or contain line breaks')
  return password
}

export { sqlString } from '../../../core/mariadb/mariadb.js'
export { alterUserStatement, runRemoteSql, setUserPassword } from '../../../core/mariadb/users.js'

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nSets the password of the MariaDB user <name> on every host it is defined for. Connects over SSH and runs mariadb as root there (sudo -n). The password is read from stdin when -db-password is not given.`)
    return
  }
  const options = parseUserPasswordArgs(args)
  const dbPassword = options.dbPassword ?? readPasswordFromStdin()
  const hosts = await setUserPassword({ dbName: options.dbName, dbPassword, sshConfig: options.sshConfig })
  console.log(`Password set for MariaDB user ${options.dbName} on ${options.sshConfig}: ${hosts.join(', ')}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
