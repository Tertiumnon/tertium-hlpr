#!/usr/bin/env node
import { type Pm2Args, parsePm2Args, runPm2 } from '../../../core/pm2/pm2.js'

// @description Stop a PM2 process on a remote host

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr pm2 stop -host <hostname> -name <pm2 name>'

export function parseStopArgs(args: string[]): Pm2Args {
  return parsePm2Args('stop', args, USAGE)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nRuns pm2 stop <name> on the host over ssh. The process stays in the PM2 list; start it again with hlpr pm2 start or restart.`)
    return
  }
  const options = parseStopArgs(args)
  runPm2(options.sshConfig, 'stop', options.name)
  console.log(`Stopped ${options.name} on ${options.sshConfig}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
