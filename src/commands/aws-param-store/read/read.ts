#!/usr/bin/env node
import { getParameter, type AwsRunner, runAws, validateParamName } from '../../../core/aws/param-store.js'
import { readEnvKey, validateEnvKey } from '../../../core/env-file.js'

// @description Print one AWS Systems Manager Parameter Store value, or one variable from a .env value

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr aws-param-store read -name <param name> [-key <variable>]'

export interface ReadOptions {
  name: string
  key?: string
}

export function parseReadArgs(args: string[]): ReadOptions {
  const values: Record<string, string> = {}
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]
    if (!['-name', '-key'].includes(flag) || values[flag] !== undefined || !value || value.startsWith('-')) throw new Error(USAGE)
    values[flag] = value
  }
  if (!values['-name']) throw new Error(USAGE)
  return {
    name: validateParamName(values['-name']),
    key: values['-key'] === undefined ? undefined : validateEnvKey(values['-key']),
  }
}

/** Returns the stored value exactly as it is, decrypted. Nothing is written to disk. */
export function readParameter(name: string, aws: AwsRunner = runAws): string {
  return getParameter(name, aws).value
}

/** Returns the unquoted value of one KEY=value line in the stored .env value. */
export function readParameterKey(name: string, key: string, aws: AwsRunner = runAws): string {
  return readEnvKey(getParameter(name, aws).value, key)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nPrints the value of the parameter (SecureString values are decrypted) exactly as stored, to standard output. With -key, prints only that variable's value, without quotes. Uses the AWS CLI.`)
    return
  }
  const options = parseReadArgs(args)
  process.stdout.write(options.key === undefined ? readParameter(options.name) : readParameterKey(options.name, options.key))
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
