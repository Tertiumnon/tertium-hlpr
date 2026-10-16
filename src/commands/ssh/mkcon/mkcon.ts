#!/usr/bin/env node
import { saveConnection } from '../../../core/ssh/config.js'
import { promptConnection } from '../../../core/ssh/connection.js'
import { ensureKeyPair, keyPathFor, runCommand } from '../../../core/ssh/key.js'

// @description Create an SSH key, authorize it on a host, and save the connection

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

async function addConnection(): Promise<void> {
  const { user, host, alias, configPath } = await promptConnection()
  const keyPath = keyPathFor(host, user)
  const publicKey = await ensureKeyPair(keyPath, `${user}@${host}`)

  console.log(`Authorizing key on ${user}@${host}. SSH may ask for a password.`)
  runCommand('ssh', [`${user}@${host}`, remoteAuthorizationCommand], `${publicKey}\n`)

  const backup = await saveConnection(configPath, alias, user, host, keyPath)
  console.log(`Config backup: ${backup}`)
  console.log(`Connection saved. Use: ssh ${alias}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr ssh mkcon')
    console.log('Prompt for a user, host, and connection name; install a key and back up local and remote SSH files before editing.')
  } else if (args.length !== 0) {
    console.error('Usage: hlpr ssh mkcon')
    process.exitCode = 1
  } else {
    addConnection().catch(error => {
      console.error(`Error: ${error instanceof Error ? error.message : error}`)
      process.exitCode = 1
    })
  }
}
