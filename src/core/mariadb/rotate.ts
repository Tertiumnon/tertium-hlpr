import { spawnSync } from 'node:child_process'
import { randomInt } from 'node:crypto'
import { type Parameter, getParameter, putParameter } from '../aws/param-store.js'
import { CLIENT_CANDIDATES, type DbTarget, detectRemoteBinary, parseDatabaseUrl, readDatabaseUrl, sq } from './mariadb.js'
import { runRemoteSql, setUserPassword } from './users.js'

// Rotates one database user's password: the database itself, then the SSM parameter that holds DATABASE_URL.
// Each step is undone, in reverse, if a later one fails. What runs on the application side (its env file,
// its process) is not in here; the caller does that and calls back to this command to undo it.

export interface RotateOptions {
  /** The host the database runs on: a HostName or Host alias from ~/.ssh/config. */
  sshConfig: string
  /** SSM parameter whose value is an env file with DATABASE_URL. */
  paramName: string
  dryRun: boolean
}

// Everything that touches the outside world, so the flow can be tested without a server.
export interface RotateSystem {
  readParameter(name: string): Parameter
  writeParameter(parameter: Parameter, value: string): number
  alterPassword(sshConfig: string, dbName: string, password: string): Promise<string[]>
  /** True when a new connection with this target's credentials succeeds from the database host. */
  canLogin(target: DbTarget): Promise<boolean>
  newPassword(): string
  log(message: string): void
}

export interface RotateResult {
  dbName: string
  hosts: string[]
  paramVersion: number
}

const PASSWORD_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/** A random password of letters and digits: no characters that need escaping in a URL or in SQL. */
export function generatePassword(length = 40): string {
  let password = ''
  for (let index = 0; index < length; index++) password += PASSWORD_CHARACTERS[randomInt(PASSWORD_CHARACTERS.length)]
  return password
}

/** Replaces the DATABASE_URL line of an env file, keeping its quotes. Throws if there is no such line. */
export function replaceDatabaseUrl(text: string, databaseUrl: string): string {
  const line = /^(\s*DATABASE_URL\s*=\s*)(['"]?)(.*?)\2\s*$/m
  if (!line.test(text)) throw new Error('DATABASE_URL is not set in the env file')
  return text.replace(line, (_match, prefix: string, quote: string) => `${prefix}${quote}${databaseUrl}${quote}`)
}

/** The same URL with another password. */
export function withPassword(databaseUrl: string, password: string): string {
  const url = new URL(databaseUrl)
  url.password = password
  return url.toString()
}

export async function rotatePassword(options: RotateOptions, system: RotateSystem): Promise<RotateResult | undefined> {
  const parameter = system.readParameter(options.paramName)
  const databaseUrl = readDatabaseUrl(parameter.value)
  const current = parseDatabaseUrl(databaseUrl, options.sshConfig)
  const dbPlace = `${current.user}@${current.host}:${current.port}/${current.database}`

  if (options.dryRun) {
    system.log(`Dry run: would change the password of ${dbPlace} on ${options.sshConfig} and update ${options.paramName}`)
    return undefined
  }

  const password = system.newPassword()
  const newParamValue = replaceDatabaseUrl(parameter.value, withPassword(databaseUrl, password))
  const undo: { label: string, run: () => Promise<void> | void }[] = []
  let hosts: string[] = []
  let paramVersion = parameter.version

  try {
    hosts = await system.alterPassword(options.sshConfig, current.user, password)
    undo.push({ label: 'database password', run: async () => { await system.alterPassword(options.sshConfig, current.user, current.password) } })
    system.log(`✓ Database password changed for ${current.user} on ${hosts.join(', ')}`)

    if (!(await system.canLogin({ ...current, password }))) throw new Error(`The new password does not log in to ${dbPlace}`)
    system.log('✓ The new password logs in')

    paramVersion = system.writeParameter(parameter, newParamValue)
    undo.push({ label: options.paramName, run: () => { system.writeParameter(parameter, parameter.value) } })
    system.log(`✓ ${options.paramName} updated (version ${paramVersion})`)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    system.log(`✗ ${reason}`)
    for (const step of undo.reverse()) {
      try {
        await step.run()
        system.log(`↩ Rolled back ${step.label}`)
      } catch (rollbackError) {
        system.log(`✗ Could not roll back ${step.label}: ${rollbackError instanceof Error ? rollbackError.message : rollbackError}`)
      }
    }
    throw new Error(`Password rotation for ${current.user} failed and was rolled back where possible: ${reason}`)
  }

  return { dbName: current.database, hosts, paramVersion }
}

// --- The real system: ssh to the database host, the AWS CLI for SSM, the MariaDB client on the host. ---

// Synchronous ssh with optional stdin: the rotation reads top to bottom, and secrets go on stdin, not argv.
function sshSync(sshConfig: string, command: string, input?: string): string {
  const result = spawnSync('ssh', ['-o', 'BatchMode=yes', sshConfig, command], {
    encoding: 'utf-8',
    input,
    stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
  })
  if (result.error) throw new Error(`Cannot run ssh: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`ssh ${sshConfig} failed (exit ${result.status}): ${result.stderr.trim()}`)
  return result.stdout
}

export function realRotateSystem(log: (message: string) => void = console.log): RotateSystem {
  return {
    readParameter: name => getParameter(name),
    writeParameter: (parameter, value) => putParameter(parameter, value),
    alterPassword: (sshConfig, dbName, password) => setUserPassword({ sshConfig, dbName, dbPassword: password }, runRemoteSql),
    canLogin: async target => {
      const client = detectRemoteBinary(target.ssh, CLIENT_CANDIDATES)
      // The password is the first line on stdin; the remote shell exports it, so it never appears in a command line.
      const command = `IFS= read -r MYSQL_PWD && export MYSQL_PWD && ${sq(client)} -h ${sq(target.host)} -P ${sq(target.port)} -u ${sq(target.user)} -N -e ${sq('SELECT 1')}`
      try {
        return sshSync(target.ssh, command, `${target.password}\n`).trim() === '1'
      } catch {
        return false
      }
    },
    newPassword: generatePassword,
    log,
  }
}
