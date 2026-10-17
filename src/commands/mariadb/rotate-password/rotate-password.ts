#!/usr/bin/env node
import { validateParamName } from '../../../core/aws/param-store.js'
import { parseFlags } from '../../../core/mariadb/mariadb.js'
import { type RotateOptions, realRotateSystem, rotatePassword } from '../../../core/mariadb/rotate.js'
import { type DestinationDeps, destinationFor, sshTargetFromFlags } from '../../../core/ssh/destination.js'

// @description Change a database user's password: the database and the SSM parameter that holds DATABASE_URL

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr mariadb rotate-password -ssm-param <name> [-ssh-host <host>] [-ssh-user <user>] [-dry-run]'

export function parseRotateArgs(args: string[], deps: DestinationDeps = {}): RotateOptions {
  const values = parseFlags(args, ['-ssh-host', '-ssh-user', '-ssm-param'], ['-dry-run'])
  const ssm = values['-ssm-param']
  if (typeof ssm !== 'string') throw new Error(USAGE)
  return {
    sshConfig: destinationFor(sshTargetFromFlags(values), deps),
    paramName: validateParamName(ssm, '-ssm-param'),
    dryRun: values['-dry-run'] === true,
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nGenerates a new random password for the database user in DATABASE_URL and sets it on every host the user is defined on. Logs in with it to check, then writes DATABASE_URL (same parameter, same type) to the SSM parameter. A failed step is rolled back. -dry-run prints the plan only.`)
    return
  }
  const result = await rotatePassword(parseRotateArgs(args), realRotateSystem())
  if (result) console.log(`Rotated ${result.dbName}: database (${result.hosts.join(', ')}), SSM version ${result.paramVersion}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
