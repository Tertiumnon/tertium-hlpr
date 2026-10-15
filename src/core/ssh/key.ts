import { spawnSync } from 'node:child_process'
import { mkdir, readFile, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export function runCommand(command: string, args: string[], input?: string): void {
  const result = spawnSync(command, args, { stdio: input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit'], input })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`)
}

// Key pairs are named {host}-{user}, so mkcon and mkkey find the same key.
export function keyPathFor(host: string, user: string): string {
  return path.join(os.homedir(), '.ssh', `${host}-${user}`)
}

async function fileExists(filePath: string): Promise<boolean> {
  try { await stat(filePath); return true }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

// Creates an Ed25519 pair at keyPath unless it already exists. Returns the public key.
export async function ensureKeyPair(keyPath: string, comment: string): Promise<string> {
  const publicPath = `${keyPath}.pub`
  await mkdir(path.dirname(keyPath), { recursive: true, mode: 0o700 })
  const privateExists = await fileExists(keyPath)
  const publicExists = await fileExists(publicPath)
  if (privateExists !== publicExists) throw new Error(`Incomplete key pair at ${keyPath}; resolve it before retrying`)
  if (privateExists) console.log(`Using existing SSH key: ${keyPath}`)
  else {
    console.log(`Creating SSH key: ${keyPath}`)
    runCommand('ssh-keygen', ['-t', 'ed25519', '-f', keyPath, '-C', comment])
  }
  const publicKey = (await readFile(publicPath, 'utf8')).trim()
  if (!publicKey.startsWith('ssh-ed25519 ') || publicKey.includes('\n')) throw new Error(`Invalid public key: ${publicPath}`)
  return publicKey
}
