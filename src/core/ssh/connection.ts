import { readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { hasHostAlias } from './config.js'

export interface Connection {
  user: string
  host: string
  alias: string
  configPath: string
}

async function prompt(lines: AsyncIterator<string>, question: string): Promise<string> {
  process.stdout.write(question)
  const answer = await lines.next()
  if (answer.done) throw new Error('Input ended before setup was complete')
  return answer.value.trim()
}

// Asks for user, host, and connection name, then validates them. Fails before any key is created if the name is taken.
export async function promptConnection(): Promise<Connection> {
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

  const configPath = path.join(os.homedir(), '.ssh', 'config')
  try {
    if (hasHostAlias(await readFile(configPath, 'utf8'), alias)) throw new Error(`SSH host "${alias}" already exists in ${configPath}`)
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  return { user, host, alias, configPath }
}
