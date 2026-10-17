#!/usr/bin/env node
import { type AwsRunner, deleteParameter, runAws, validateParamName } from '../../../core/aws/param-store.js'

// @description Remove an AWS Systems Manager Parameter Store value; needs the name typed again as -confirm

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr aws-param-store remove -name <param name> -confirm <param name>'

export function parseRemoveArgs(args: string[]): { name: string } {
  const values: Record<string, string> = {}
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]
    if (!['-name', '-confirm'].includes(flag) || values[flag] !== undefined || value === undefined || value.startsWith('-')) throw new Error(USAGE)
    values[flag] = value
  }
  const name = values['-name']
  if (!name || values['-confirm'] === undefined) throw new Error(USAGE)
  validateParamName(name)
  // The name typed twice: a parameter is not removed by one stray flag.
  if (values['-confirm'] !== name) throw new Error(`-confirm must repeat the name exactly (${name}); nothing was removed`)
  return { name }
}

/** Deletes the parameter. Returns the name removed. */
export function removeParameter(name: string, aws: AwsRunner = runAws): string {
  deleteParameter(name, aws)
  return name
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nDeletes the parameter with its value and history. -confirm must repeat the name, so a single flag cannot remove one by mistake.`)
    return
  }
  const { name } = parseRemoveArgs(args)
  removeParameter(name)
  console.log(`✓ Removed ${name}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
