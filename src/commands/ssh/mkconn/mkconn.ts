#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { constants } from 'node:fs'
import { appendFile, chmod, copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'

// @description Create an SSH key, authorize it on a host, and save the connection

export function hasHostAlias(config: string, alias: string): boolean {
  return config.split(/\r?\n/).some(line => {
    const match = line.match(/^\s*Host\s+(.+?)(?:\s+#.*)?$/i)
    return match?.[1].split(/\s+/).some(name => name.toLowerCase() === alias.toLowerCase()) ?? false
  })
}

export async function saveConnection(configPath: string, alias: string, user: string, host: string, keyPath: string): Promise<string | undefined> {
  let existing = ''
  let configExists = false
  try { existing = await readFile(configPath, 'utf8'); configExists = true }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  if (hasHostAlias(existing, alias)) throw new Error(`SSH host "${alias}" already exists in ${configPath}`)

  const newline = existing.includes('\r\n') ? '\r\n' : '\n'
  const separator = !existing || existing.endsWith(`${newline}${newline}`) ? '' : existing.endsWith(newline) ? newline : `${newline}${newline}`
  const entry = `Host ${alias}${newline}    HostName ${host}${newline}    User ${user}${newline}    IdentityFile "${keyPath.replace(/\\/g, '/')}"${newline}    IdentitiesOnly yes${newline}`
  const backup = `${configPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`
  if (configExists) await copyFile(configPath, backup, constants.COPYFILE_EXCL)
  else await writeFile(backup, '', { flag: 'wx', mode: 0o600 })
  await appendFile(configPath, separator + entry, { mode: 0o600 })
  if (process.platform !== 'win32') await chmod(configPath, 0o600)
  return backup
}

export const remoteAuthorizationCommand = `
set -e
umask 077
mkdir -p "$HOME/.ssh"
file="$HOME/.ssh/authorized_keys"
backup=$(mktemp "$file.bak-XXXXXXXXXX")
if [ -e "$file" ]; then cp -p "$file" "$backup"; fi
printf 'Remote backup: %s\\n' "$backup"
chmod 700 "$HOME/.ssh"
touch "$file"
chmod 600 "$file"
IFS= read -r key
grep -qxF "$key" "$file" || printf '%s\\n' "$key" >> "$file"
`

function run(command: string, args: string[], input?: string): void {
  const result = spawnSync(command, args, { stdio: input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit'], input })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`)
}

async function fileExists(filePath: string): Promise<boolean> {
  try { await stat(filePath); return true }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

async function prompt(lines: AsyncIterator<string>, question: string): Promise<string> {
  process.stdout.write(question)
  const answer = await lines.next()
  if (answer.done) throw new Error('Input ended before setup was complete')
  return answer.value.trim()
}

async function addConnection(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const lines = rl[Symbol.asyncIterator]()
  let user: string
  let host: string
  let alias: string
  try {
    user = await prompt(lines, 'SSH user: ')
    host = await prompt(lines, 'Host or IP: ')
    alias = await prompt(lines, `Connection name [${host}]: `) || host
  } finally { rl.close() }

  if (!/^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(user)) throw new Error('Invalid SSH user')
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.:-]*$/.test(host)) throw new Error('Invalid host or IP')
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(alias)) throw new Error('Invalid connection name')

  const sshDir = path.join(os.homedir(), '.ssh')
  const configPath = path.join(sshDir, 'config')
  const keyPath = path.join(sshDir, `${alias}-${user}`)
  const publicPath = `${keyPath}.pub`
  await mkdir(sshDir, { recursive: true, mode: 0o700 })
  try {
    if (hasHostAlias(await readFile(configPath, 'utf8'), alias)) throw new Error(`SSH host "${alias}" already exists in ${configPath}`)
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }

  const privateExists = await fileExists(keyPath)
  const publicExists = await fileExists(publicPath)
  if (privateExists !== publicExists) throw new Error(`Incomplete key pair at ${keyPath}; resolve it before retrying`)
  if (!privateExists) {
    console.log(`Creating SSH key: ${keyPath}`)
    run('ssh-keygen', ['-t', 'ed25519', '-f', keyPath, '-C', `${user}@${host}`])
  }
  const publicKey = (await readFile(publicPath, 'utf8')).trim()
  if (!publicKey.startsWith('ssh-ed25519 ') || publicKey.includes('\n')) throw new Error(`Invalid public key: ${publicPath}`)

  console.log(`Authorizing key on ${user}@${host}. SSH may ask for a password.`)
  run('ssh', [`${user}@${host}`, remoteAuthorizationCommand], `${publicKey}\n`)

  const backup = await saveConnection(configPath, alias, user, host, keyPath)
  console.log(`Config backup: ${backup}`)
  console.log(`Connection saved. Use: ssh ${alias}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr ssh mkconn')
    console.log('Prompt for a user, host, and connection name; install a key and back up local and remote SSH files before editing.')
  } else if (args.length !== 0) {
    console.error('Usage: hlpr ssh mkconn')
    process.exitCode = 1
  } else {
    addConnection().catch(error => {
      console.error(`Error: ${error instanceof Error ? error.message : error}`)
      process.exitCode = 1
    })
  }
}
