import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { hostAliasesFor } from './config.js'

// What the user typed: the host name as written in ~/.ssh/config (HostName) and the remote file.
export interface RemoteFileArgs {
  path: string
  host: string
}

// Resolved for ssh: the Host alias from ~/.ssh/config that carries the connection settings.
export interface RemoteFileOptions {
  path: string
  sshConfig: string
}

export type RemoteRun = (sshConfig: string, command: string, input?: Buffer) => Promise<Buffer>

// Parses `-host <hostname> -path <path>`. Literal usage comes from the caller so `hlpr help` can scrape it.
export function parseRemoteFileArgs(args: string[], usage: string): RemoteFileArgs {
  const values: Record<string, string> = {}
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (!['-path', '-host'].includes(arg) || values[arg] !== undefined) throw new Error(usage)
    const value = args[index + 1]
    if (value === undefined || value.startsWith('-')) throw new Error(usage)
    values[arg] = value
    index++
  }
  const remotePath = values['-path']
  const host = values['-host']
  if (!remotePath || !host) throw new Error(usage)
  return { path: remotePath, host }
}

export type SshResolver = (host: string) => string

// Finds the one ~/.ssh/config entry whose HostName is host, and returns its Host alias for ssh.
export function resolveSshHost(host: string, configPath = path.join(os.homedir(), '.ssh', 'config')): string {
  let config: string
  try {
    config = readFileSync(configPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`No SSH config found at ${configPath}`)
    throw error
  }
  const aliases = hostAliasesFor(config, host)
  if (aliases.length === 0) throw new Error(`No SSH config entry with HostName "${host}" in ${configPath}`)
  if (aliases.length > 1) throw new Error(`Several SSH config entries use HostName "${host}": ${aliases.join(', ')}. Keep one.`)
  return aliases[0]
}

export function resolveRemoteFile(args: RemoteFileArgs, configPath?: string): RemoteFileOptions {
  return { path: args.path, sshConfig: resolveSshHost(args.host, configPath) }
}

// Single-quotes the path for the remote POSIX shell. A leading ~/ stays unquoted so the remote shell expands it.
export function remoteShellPath(remotePath: string): string {
  const home = remotePath.startsWith('~/') ? '~/' : ''
  return `${home}'${remotePath.slice(home.length).replace(/'/g, `'\\''`)}'`
}

// Runs one command on the host over ssh, sending `input` on stdin. Rejects with ssh's stderr on failure.
export function runSsh(sshConfig: string, command: string, input?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn('ssh', [sshConfig, command], { stdio: ['pipe', 'pipe', 'pipe'] })
    const chunks: Buffer[] = []
    let stderr = ''
    child.stdout.on('data', chunk => chunks.push(chunk))
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve(Buffer.concat(chunks))
      else reject(new Error(`ssh ${sshConfig} failed (exit ${code}): ${stderr.trim()}`))
    })
    child.stdin.end(input)
  })
}
