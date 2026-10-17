#!/usr/bin/env node
import { type Pm2Args, parsePm2Args, runPm2 } from '../../../core/pm2/pm2.js'

// @description Start the PM2 apps of an ecosystem config on a remote host

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr pm2 start -host <hostname> -dir <dir> -config <file>'

export function parseStartArgs(args: string[]): Pm2Args {
  return parsePm2Args('start', args, USAGE)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nRuns pm2 start <config> from <dir> on the host over ssh, starting every app the config declares.`)
    return
  }
  const options = parseStartArgs(args)
  runPm2(options.sshConfig, 'start', undefined, { dir: options.dir, config: options.config })
  console.log(`Started ${options.config} from ${options.dir} on ${options.sshConfig}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
