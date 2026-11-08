#!/usr/bin/env node
import { saveConnection } from '../../../core/ssh/config.js'
import { promptConnection } from '../../../core/ssh/connection.js'
import { ensureKeyPair, keyPathFor } from '../../../core/ssh/key.js'

// @description Create an SSH key pair and save its connection to ~/.ssh/config

const createKey = async (type: 'ed25519' | 'rsa'): Promise<void> => {
  const { user, host, alias, configPath } = await promptConnection()
  const keyPath = keyPathFor(host, user)
  const publicKey = await ensureKeyPair(keyPath, `${user}@${host}`, type)

  const backup = await saveConnection(configPath, alias, user, host, keyPath)
  console.log(`Config backup: ${backup}`)
  console.log(`Connection saved. Use: ssh ${alias}`)
  console.log(`\nPublic key (${keyPath}.pub):`)
  console.log(publicKey)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr ssh mkkey [--rsa]')
    console.log('Create an Ed25519 key pair (or RSA with --rsa) and save the connection. Shows the public key at the end.')
  } else if (args.length > 1 || (args.length === 1 && args[0] !== '--rsa')) {
    console.error('Usage: hlpr ssh mkkey [--rsa]')
    process.exitCode = 1
  } else {
    createKey(args[0] === '--rsa' ? 'rsa' : 'ed25519').catch(error => {
      console.error(`Error: ${error instanceof Error ? error.message : error}`)
      process.exitCode = 1
    })
  }
}
