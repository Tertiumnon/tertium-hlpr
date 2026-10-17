#!/usr/bin/env node
import { getParameter, type AwsRunner, runAws, validateParamName } from '../../../core/aws/param-store.js'

// @description Print one AWS Systems Manager Parameter Store value

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr aws-param-store read -name <param name>'

export function parseReadArgs(args: string[]): string {
  const [flag, name] = args
  if (args.length !== 2 || flag !== '-name' || !name || name.startsWith('-')) throw new Error(USAGE)
  return validateParamName(name)
}

/** Returns the stored value exactly as it is, decrypted. Nothing is written to disk. */
export function readParameter(name: string, aws: AwsRunner = runAws): string {
  return getParameter(name, aws).value
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nPrints the value of the parameter (SecureString values are decrypted) exactly as stored, to standard output. Uses the AWS CLI.`)
    return
  }
  process.stdout.write(readParameter(parseReadArgs(args)))
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
