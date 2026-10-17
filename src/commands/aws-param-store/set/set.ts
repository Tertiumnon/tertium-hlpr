#!/usr/bin/env node
import { type AwsRunner, getParameter, putParameter, readValueFromStdin, runAws, validateParamName } from '../../../core/aws/param-store.js'
import { setEnvKey, validateEnvKey } from '../../../core/env-file.js'

// @description Replace one KEY=value line in a .env value stored in AWS Parameter Store

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr aws-param-store set -name <param name> -key <variable> [-value <value>]'

export interface SetOptions {
  name: string
  key: string
  value?: string
}

export function parseSetArgs(args: string[]): SetOptions {
  const values: Record<string, string> = {}
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]
    if (!['-name', '-key', '-value'].includes(flag) || values[flag] !== undefined || value === undefined) throw new Error(USAGE)
    if (value.startsWith('-') && flag !== '-value') throw new Error(USAGE)
    values[flag] = value
  }
  if (!values['-name'] || !values['-key']) throw new Error(USAGE)
  return { name: validateParamName(values['-name']), key: validateEnvKey(values['-key']), value: values['-value'] }
}


/** Replaces only the key line. Returns the new version, or undefined when the line already holds the value. */
export function setParameterKey(name: string, key: string, value: string, aws: AwsRunner = runAws): number | undefined {
  const parameter = getParameter(name, aws)
  const updated = setEnvKey(parameter.value, key, value)
  if (updated === parameter.value) return undefined
  return putParameter(parameter, updated, aws)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nReplaces the value of one KEY=value line in the stored .env value, and keeps every other line. The parameter keeps its type. The new value is read from stdin unless -value is given. Refuses a missing or repeated key.`)
    return
  }
  const options = parseSetArgs(args)
  const version = setParameterKey(options.name, options.key, options.value ?? readValueFromStdin())
  console.log(version === undefined ? `No change to ${options.key} in ${options.name}` : `✓ Set ${options.key} in ${options.name} (version ${version})`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
