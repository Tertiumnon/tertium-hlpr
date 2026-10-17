import { spawn } from 'node:child_process'
import { sqlString } from './mariadb.js'

// Sets a MariaDB user's password on a host over SSH. Shared by `mariadb set-user-password` and `mariadb rotate-password`.

export interface UserPasswordTarget {
  dbName: string
  dbPassword: string
  sshConfig: string
}

// Runs one SQL script as root on the remote host and returns its output. The script travels over stdin,
// so the password never appears in the remote process list.
export type RemoteSql = (sshConfig: string, sql: string) => Promise<string>

// Every account row of the user (one per host it may connect from), so the password changes everywhere.
function hostsQuery(name: string): string {
  return `SELECT host FROM mysql.user WHERE user = ${sqlString(name)};\n`
}

export function alterUserStatement(name: string, host: string, password: string): string {
  return `ALTER USER ${sqlString(name)}@${sqlString(host)} IDENTIFIED BY ${sqlString(password)};\n`
}

// Returns the hosts whose password was changed. Throws if the user does not exist on the remote server.
export async function setUserPassword(target: UserPasswordTarget, runSql: RemoteSql = runRemoteSql): Promise<string[]> {
  const hosts = (await runSql(target.sshConfig, hostsQuery(target.dbName)))
    .split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (hosts.length === 0) throw new Error(`No MariaDB user "${target.dbName}" on ${target.sshConfig}`)
  const script = hosts.map(host => alterUserStatement(target.dbName, host, target.dbPassword)).join('')
  await runSql(target.sshConfig, script)
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
