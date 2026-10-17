#!/usr/bin/env node
import { parseRemoteFileArgs, remoteShellPath, resolveRemoteFile, runSsh, type RemoteFileArgs, type RemoteFileOptions, type RemoteRun } from '../../../core/ssh/remote.js'

// @description Print a file from a remote host over SSH

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr file read -host <hostname> -path <path>'

export function parseReadArgs(args: string[]): RemoteFileArgs {
  return parseRemoteFileArgs(args, USAGE)
}

export async function readRemoteFile(options: RemoteFileOptions, run: RemoteRun = runSsh): Promise<Buffer> {
  return run(options.sshConfig, `cat -- ${remoteShellPath(options.path)}`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nPrints a file from the remote host over SSH. The -host value is the HostName in ~/.ssh/config (see ~/.ssh/config).`)
    return
  }
  process.stdout.write(await readRemoteFile(resolveRemoteFile(parseReadArgs(args))))
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
