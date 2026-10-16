#!/usr/bin/env node
import { saveConnection } from '../../../core/ssh/config.js'
import { promptConnection } from '../../../core/ssh/connection.js'
import { ensureKeyPair, keyPathFor } from '../../../core/ssh/key.js'

// @description Create an SSH key pair and save its connection to ~/.ssh/config

async function createKey(): Promise<void> {
  const { user, host, alias, configPath } = await promptConnection()
  const keyPath = keyPathFor(host, user)
  const publicKey = await ensureKeyPair(keyPath, `${user}@${host}`)

  const backup = await saveConnection(configPath, alias, user, host, keyPath)
  console.log(`Config backup: ${backup}`)
  console.log(`Connection saved. Use: ssh ${alias}`)
  console.log(`\nPublic key (${keyPath}.pub):`)
  console.log(publicKey)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr ssh mkkey')
    console.log('Prompt for a user, host, and connection name; create an Ed25519 key pair and save the connection. Shows the public key at the end.')
  } else if (args.length !== 0) {
    console.error('Usage: hlpr ssh mkkey')
    process.exitCode = 1
  } else {
    createKey().catch(error => {
      console.error(`Error: ${error instanceof Error ? error.message : error}`)
      process.exitCode = 1
    })
  }
}
