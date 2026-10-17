#!/usr/bin/env node
import { type AwsRunner, createParameter, type ParameterType, readValueFromStdin, runAws, validateParamName } from '../../../core/aws/param-store.js'

// @description Add a new AWS Systems Manager Parameter Store value; the name must not exist yet

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr aws-param-store add -name <param name> [-type SecureString|String] [-value <value>]'

export interface AddOptions {
  name: string
  type: ParameterType
  /** Absent when the value is read from stdin, so it stays off the command line. */
  value?: string
}

export function parseAddArgs(args: string[]): AddOptions {
  const values: Record<string, string> = {}
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]
    if (!['-name', '-type', '-value'].includes(flag) || values[flag] !== undefined || value === undefined) throw new Error(USAGE)
    if (value.startsWith('-') && flag !== '-value') throw new Error(USAGE)
    values[flag] = value
  }
  if (!values['-name']) throw new Error(USAGE)
  const type = values['-type'] ?? 'SecureString'
  if (type !== 'SecureString' && type !== 'String') throw new Error('Invalid -type: use SecureString or String')
  if (values['-value'] === '') throw new Error('Invalid -value: a parameter cannot be empty')
  return { name: validateParamName(values['-name']), type, value: values['-value'] }
}

/** Creates the parameter. AWS refuses a name that exists, so nothing is overwritten. Returns the version. */
export function addParameter(options: AddOptions, value: string, aws: AwsRunner = runAws): number {
  if (value === '') throw new Error('The value is empty; a parameter cannot be empty')
  return createParameter(options.name, value, options.type, aws)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nCreates the parameter as SecureString (the default) or String. The value is read from stdin unless -value is given. Refuses a name that already exists, so an existing value is never overwritten.`)
    return
  }
  const options = parseAddArgs(args)
  const version = addParameter(options, options.value ?? readValueFromStdin())
  console.log(`✓ Added ${options.name} (version ${version})`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
