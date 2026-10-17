#!/usr/bin/env node
import { type Pm2Args, parsePm2Args, runPm2 } from '../../../core/pm2/pm2.js'

// @description Restart a PM2 process on a remote host, so it reads its current environment

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr pm2 restart [-ssh-host <host>] [-ssh-user <user>] [-ssm-param <name>] -name <pm2 name>'

export function parseRestartArgs(args: string[]): Pm2Args {
  return parsePm2Args('restart', args, USAGE)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nRuns pm2 restart <name> --update-env on the host over ssh. The remote shell is zsh -i when available, so pm2 is found on its PATH.`)
    return
  }
  const options = parseRestartArgs(args)
  runPm2(options.sshConfig, 'restart', options.name)
  console.log(`Restarted ${options.name} on ${options.sshConfig}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
