import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// AWS Systems Manager Parameter Store, through the AWS CLI. Values are read in memory; a write
// goes through a private temp file (removed right after), so the value never shows on the command line.

export interface Parameter {
  name: string
  type: string
  value: string
  version: number
}

// Runs `aws` with the given arguments and returns stdout. Throws with the CLI's error text on failure.
export type AwsRunner = (args: string[]) => string

export const runAws: AwsRunner = args => {
  const result = spawnSync('aws', args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (result.error) throw new Error(`Cannot run aws: ${result.error.message}`)
  if (result.status !== 0) throw new Error(result.stderr.trim() || `aws exited with ${result.status}`)
  return result.stdout
}

export function validateParamName(name: string, flag = '-name'): string {
  if (!/^\/[A-Za-z0-9_./-]+$/.test(name)) throw new Error(`Invalid ${flag}: use a parameter name such as /env/app/env.dev`)
  return name
}

export function getParameter(name: string, aws: AwsRunner = runAws): Parameter {
  const json = JSON.parse(aws(['ssm', 'get-parameter', '--name', name, '--with-decryption', '--output', 'json']))
  const parameter = json.Parameter
  return { name: parameter.Name, type: parameter.Type, value: parameter.Value, version: parameter.Version }
}

// The decrypted value only, read in memory.
export const readSsmParameter = (name: string): string => getParameter(name).value

// Writes the value with the same type it has now (SecureString stays SecureString). Returns the new version.
export function putParameter(parameter: Parameter, value: string, aws: AwsRunner = runAws): number {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'hlpr-param-'))
  const file = path.join(dir, 'value')
  try {
    writeFileSync(file, value, { mode: 0o600 })
    const output = aws(['ssm', 'put-parameter', '--name', parameter.name, '--type', parameter.type, '--overwrite', '--value', `file://${file}`, '--output', 'json'])
    return JSON.parse(output).Version
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export type ParameterType = 'SecureString' | 'String';

// Creates a parameter. It must not exist yet: AWS refuses an existing name, so nothing is overwritten. Returns the version.
export function createParameter(name: string, value: string, type: ParameterType, aws: AwsRunner = runAws): number {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'hlpr-param-'));
  const file = path.join(dir, 'value');
  try {
    writeFileSync(file, value, { mode: 0o600 });
    const output = aws(['ssm', 'put-parameter', '--name', name, '--type', type, '--value', `file://${file}`, '--output', 'json']);
    return JSON.parse(output).Version;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Deletes a parameter. The caller decides whether that is allowed; this only runs the delete.
export function deleteParameter(name: string, aws: AwsRunner = runAws): void {
  aws(['ssm', 'delete-parameter', '--name', name]);
}

// The new value from stdin, without its last line break, so it stays off the command line.
export function readValueFromStdin(): string {
  if (process.stdin.isTTY) throw new Error('No -value given: pipe the value on stdin, or pass -value');
  return readFileSync(0, 'utf-8').replace(/\r?\n$/, '');
}
