#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { sqlString, validateSshConfig } from '../../../core/mariadb/mariadb.js'
import { type SshResolver, resolveSshHost } from '../../../core/ssh/remote.js'

// @description Set a MariaDB user's password on a remote host over SSH

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr mariadb user-password -db-name <name> -db-password <password> -host <hostname>'

export interface UserPasswordOptions {
  dbName: string
  dbPassword: string
  sshConfig: string
}

// Runs one SQL script as root on the remote host and returns its output. The script travels over stdin,
// so the password never appears in the remote process list.
export type RemoteSql = (sshConfig: string, sql: string) => Promise<string>

export function parseUserPasswordArgs(args: string[], resolve: SshResolver = resolveSshHost): UserPasswordOptions {
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
  const dbPassword = values['-db-password']
  const host = values['-host']
  if (!dbName || dbPassword === undefined || !host) throw new Error(USAGE)
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error('Invalid -db-name: use letters, digits and underscores')
  if (dbPassword === '' || /[\r\n\0]/.test(dbPassword)) throw new Error('Invalid -db-password: it must not be empty or contain line breaks')
  return { dbName, dbPassword, sshConfig: validateSshConfig(resolve(host), '-host') }
}

export { sqlString }

// Every account row of the user (one per host it may connect from), so the password changes everywhere.
function hostsQuery(name: string): string {
  return `SELECT host FROM mysql.user WHERE user = ${sqlString(name)};\n`
}

export function alterUserStatement(name: string, host: string, password: string): string {
  return `ALTER USER ${sqlString(name)}@${sqlString(host)} IDENTIFIED BY ${sqlString(password)};\n`
}

// Returns the hosts whose password was changed. Throws if the user does not exist on the remote server.
export async function setUserPassword(options: UserPasswordOptions, runSql: RemoteSql = runRemoteSql): Promise<string[]> {
  const hosts = (await runSql(options.sshConfig, hostsQuery(options.dbName)))
    .split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (hosts.length === 0) throw new Error(`No MariaDB user "${options.dbName}" on ${options.sshConfig}`)
  const script = hosts.map(host => alterUserStatement(options.dbName, host, options.dbPassword)).join('')
  await runSql(options.sshConfig, script)
  return hosts
}

// `sudo -n` fails instead of prompting; mariadb as root uses the local socket on the host.
export function runRemoteSql(sshConfig: string, sql: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('ssh', ['-o', 'BatchMode=yes', sshConfig, 'sudo -n mariadb --batch --skip-column-names'])
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve(stdout)
      else reject(new Error(`mariadb on ${sshConfig} failed (exit ${code}): ${stderr.trim()}`))
    })
    child.stdin.end(sql)
  })
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nSets the password of the MariaDB user <name> on every host it is defined for. Connects over SSH and runs mariadb as root there (sudo -n).`)
    return
  }
  const options = parseUserPasswordArgs(args)
  const hosts = await setUserPassword(options)
  console.log(`Password set for MariaDB user ${options.dbName} on ${options.sshConfig}: ${hosts.join(', ')}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
