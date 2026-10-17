#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { editorCommand, editorFlagCommand } from '../../../core/editor.js'
import { type AwsRunner, getParameter, putParameter, runAws, validateParamName } from '../../../core/aws/param-store.js'

// @description Edit one AWS Systems Manager Parameter Store value in your editor

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr aws-param-store edit -name <param name> [-editor code|edit|nano|vi]'

export function parseEditArgs(args: string[]): { name: string, editor?: string } {
  const values: Record<string, string> = {}
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]
    if (!['-name', '-editor'].includes(flag) || values[flag] !== undefined || !value || value.startsWith('-')) throw new Error(USAGE)
    values[flag] = value
  }
  if (values['-name'] === undefined) throw new Error(USAGE)
  if (values['-editor'] !== undefined) editorFlagCommand(values['-editor'])
  return { name: validateParamName(values['-name']), editor: values['-editor'] }
}

// Waits until the editor closes. The command comes from -editor, $VISUAL or $EDITOR (see core/editor.ts).
export function runEditor(file: string, editor = editorCommand()): void {
  const result = spawnSync(`${editor} "${file}"`, { shell: true, stdio: 'inherit' })
  if (result.error) throw new Error(`Cannot start the editor "${editor}": ${result.error.message}`)
  if (result.status !== 0) throw new Error(`The editor "${editor}" exited with ${result.status}; nothing was changed`)
}

export interface EditDeps {
  aws?: AwsRunner
  edit?: (file: string) => void
}

/**
 * Fetches the value into a private temp file, lets the user edit it, and writes it back only when it changed.
 * Keeps the parameter's type (SecureString stays SecureString). Returns the new version, or undefined if unchanged.
 */
export function editParameter(name: string, deps: EditDeps = {}): number | undefined {
  const aws = deps.aws ?? runAws
  const edit = deps.edit ?? runEditor
  const parameter = getParameter(name, aws)
  const dir = mkdtempSync(path.join(os.tmpdir(), 'hlpr-param-edit-'))
  const file = path.join(dir, path.basename(name) || 'value')
  try {
    writeFileSync(file, parameter.value, { mode: 0o600 })
    edit(file)
    const edited = readFileSync(file, 'utf-8')
    if (edited === parameter.value) return undefined
    if (edited.length === 0) throw new Error('The value is empty; parameters cannot be empty. Nothing was changed')
    return putParameter(parameter, edited, aws)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nOpens the parameter value in the -editor choice (code, edit, nano or vi), else $VISUAL, $EDITOR, or edit (Windows) / vi, then writes it back if it changed. The temp copy is removed afterwards. The parameter keeps its type.`)
    return
  }
  const parsed = parseEditArgs(args)
  const name = parsed.name
  const version = editParameter(name, { edit: file => runEditor(file, editorCommand(parsed.editor)) })
  console.log(version === undefined ? `No changes to ${name}` : `✓ Saved ${name} (version ${version})`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
