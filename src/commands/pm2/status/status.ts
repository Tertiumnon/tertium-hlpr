#!/usr/bin/env node
import { type Pm2Args, parsePm2Args, pm2Status } from '../../../core/pm2/pm2.js'

// @description Print the PM2 status of a process on a remote host (exit code 1 unless it is online)

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr pm2 status [-ssh-host <host>] [-ssh-user <user>] [-ssm-param <name>] -name <pm2 name>'

export function parseStatusArgs(args: string[]): Pm2Args {
  return parsePm2Args('status', args, USAGE)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nPrints online, stopped, errored, or missing (no such process). Exits with 1 unless the process is online.`)
    return
  }
  const options = parseStatusArgs(args)
  const status = pm2Status(options.sshConfig, options.name as string)
  console.log(status)
  if (status !== 'online') process.exitCode = 1
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
