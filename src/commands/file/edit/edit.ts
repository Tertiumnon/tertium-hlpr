#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { editorCommand, editorFlagCommand } from '../../../core/editor.js'
import { parseRemoteFileArgs, remoteShellPath, resolveRemoteFile, runSsh, type RemoteFileArgs, type RemoteFileOptions, type RemoteRun } from '../../../core/ssh/remote.js'

// @description Edit a remote file over SSH in your local editor, then upload it if changed

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr file edit -host <hostname> -path <path> [-editor code|edit|nano|vi]'

export type OpenEditor = (file: string) => Promise<void>

export function parseEditArgs(args: string[]): RemoteFileArgs & { editor?: string } {
  const at = args.indexOf('-editor')
  if (at === -1) return parseRemoteFileArgs(args, USAGE)
  const editor = args[at + 1]
  if (editor === undefined || editor.startsWith('-')) throw new Error(USAGE)
  editorFlagCommand(editor)
  return { ...parseRemoteFileArgs(args.filter((_, i) => i !== at && i !== at + 1), USAGE), editor }
}

// Waits until the editor exits. The command comes from -editor, $VISUAL or $EDITOR (see core/editor.ts).
export function openEditor(file: string, editor = editorCommand()): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(`${editor} "${file}"`, { shell: true, stdio: 'inherit' })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${editor} exited with code ${code}`)))
  })
}

// Downloads the file to a temp copy, lets the editor change it, and uploads it only if the bytes changed.
// Returns true when the remote file was written.
// ponytail: no check that the remote file changed while editing, last write wins. Add a hash compare before upload if that bites.
export async function editRemoteFile(options: RemoteFileOptions, run: RemoteRun = runSsh, edit: OpenEditor = openEditor): Promise<boolean> {
  const target = remoteShellPath(options.path)
  const original = await run(options.sshConfig, `cat -- ${target}`)
  const dir = await mkdtemp(path.join(os.tmpdir(), 'hlpr-file-edit-'))
  const local = path.join(dir, path.posix.basename(options.path) || 'file')
  try {
    await writeFile(local, original, { mode: 0o600 })
    await edit(local)
    const edited = await readFile(local)
    if (edited.equals(original)) return false
    await run(options.sshConfig, `cat > ${target}`, edited)
    return true
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nEdits a file on the remote host in the -editor choice (code, edit, nano or vi), else $VISUAL or $EDITOR (MS-DOS Editor on Windows, vi otherwise), and uploads it when you save changes.`)
    return
  }
  const parsed = parseEditArgs(args)
  const options = resolveRemoteFile(parsed)
  const changed = await editRemoteFile(options, runSsh, file => openEditor(file, editorCommand(parsed.editor)))
  console.log(changed ? `Saved ${options.path} on ${options.sshConfig}` : `No changes to ${options.path} on ${options.sshConfig}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
