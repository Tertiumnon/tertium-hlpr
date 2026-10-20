#!/usr/bin/env node

// @description Run a small full-screen terminal app: explorer

import * as fs from 'node:fs'
import * as path from 'node:path'
import { isQuitKey, type Key, readKeys } from '../../../core/terminal.js'

export interface Entry {
  name: string
  isDirectory: boolean
}

interface Panel {
  dir: string
  entries: Entry[]
  cursor: number
}

interface Prompt {
  text: string
  value: string
  submit: (value: string) => Promise<void>
}

interface State {
  panels: [Panel, Panel]
  active: number
  message: string
  prompt: Prompt | null
}

export function readEntries(dir: string): Entry[] {
  return fs.readdirSync(dir, { withFileTypes: true })
    .map(entry => ({ name: entry.name, isDirectory: entry.isDirectory() }))
    .sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name))
}

// The slice of entries that fits on screen, kept around the cursor.
export function visibleRange(cursor: number, count: number, height: number): [number, number] {
  const start = Math.max(0, Math.min(cursor - Math.floor(height / 2), count - height))
  return [start, Math.min(count, start + height)]
}

const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const openPanel = (dir: string, select = ''): Panel => {
  const entries = readEntries(dir)
  return { dir, entries, cursor: Math.max(0, entries.findIndex(entry => entry.name === select)) }
}

const refresh = (panel: Panel): void => {
  const name = panel.entries[panel.cursor]?.name
  Object.assign(panel, openPanel(panel.dir, name))
}

export const transfer = async (source: Panel, target: Panel, action: 'copy' | 'move'): Promise<string> => {
  const entry = source.entries[source.cursor]
  if (!entry) throw new Error('Nothing selected')
  const from = path.join(source.dir, entry.name)
  // Copy refuses to overwrite an existing target, and a folder cannot be copied into itself.
  await fs.promises.cp(from, path.join(target.dir, entry.name), { recursive: true, errorOnExist: true, force: false })
  // ponytail: move is copy then delete (works across drives); a same-drive rename would be faster.
  if (action === 'move') await fs.promises.rm(from, { recursive: true })
  return `${action === 'copy' ? 'Copied' : 'Moved'} ${entry.name}`
}

export const makeDir = async (dir: string, value: string): Promise<string> => {
  const name = value.trim()
  if (!name || /[\\/]/.test(name)) throw new Error('Folder name cannot be empty or contain slashes')
  await fs.promises.mkdir(path.join(dir, name))
  return `Created ${name}`
}

export const deleteEntry = async (dir: string, entry: Entry, answer: string): Promise<string> => {
  if (answer.trim().toLowerCase() !== 'y') return 'Delete cancelled'
  await fs.promises.rm(path.join(dir, entry.name), { recursive: true })
  return `Deleted ${entry.name}`
}

const active = (state: State): Panel => state.panels[state.active]

const attempt = async (state: State, run: () => Promise<string>): Promise<void> => {
  try {
    state.message = await run()
    state.panels.forEach(refresh)
  } catch (error) {
    state.message = `Error: ${reason(error)}`
  }
}

const showDir = (state: State, dir: string, select?: string): void => {
  try {
    state.panels[state.active] = openPanel(dir, select)
    state.message = ''
  } catch (error) {
    state.message = `Cannot open ${dir}: ${reason(error)}`
  }
}

const moveCursor = (state: State, delta: number): void => {
  const panel = active(state)
  panel.cursor = Math.max(0, Math.min(panel.entries.length - 1, panel.cursor + delta))
}

const openSelected = (state: State): void => {
  const panel = active(state)
  const entry = panel.entries[panel.cursor]
  if (entry?.isDirectory) showDir(state, path.join(panel.dir, entry.name))
}

const goUp = (state: State): void => {
  const { dir } = active(state)
  if (path.dirname(dir) !== dir) showDir(state, path.dirname(dir), path.basename(dir))
}

const typeInPrompt = (state: State, prompt: Prompt, input: string, key: Key): void => {
  if (key.name === 'escape' || (key.ctrl === true && key.name === 'c')) state.prompt = null
  else if (key.name === 'return') {
    state.prompt = null
    void prompt.submit(prompt.value)
  } else if (key.name === 'backspace') prompt.value = prompt.value.slice(0, -1)
  else if (input && input >= ' ' && key.ctrl !== true) prompt.value += input
}

const command = (state: State, input: string, key: Key): void => {
  const name = key.name ?? ''
  const panel = active(state)
  const entry = panel.entries[panel.cursor]
  if (name === 'tab') state.active = 1 - state.active
  else if (name === 'up' || input === 'k') moveCursor(state, -1)
  else if (name === 'down' || input === 'j') moveCursor(state, 1)
  else if (['return', 'right'].includes(name)) openSelected(state)
  else if (['left', 'backspace'].includes(name)) goUp(state)
  else if (name === 'f5') void attempt(state, () => transfer(panel, state.panels[1 - state.active], 'copy'))
  else if (name === 'f6') void attempt(state, () => transfer(panel, state.panels[1 - state.active], 'move'))
  else if (name === 'f7') {
    state.prompt = { text: 'Create folder: ', value: '', submit: value => attempt(state, () => makeDir(panel.dir, value)) }
  } else if (name === 'f8' && entry) {
    state.prompt = {
      text: `Delete ${entry.name}? [y/N] `,
      value: '',
      submit: value => attempt(state, () => deleteEntry(panel.dir, entry, value)),
    }
  }
}

const cell = (text: string, width: number): string => text.slice(0, width).padEnd(width)

const panelRows = (panel: Panel, width: number, height: number): string[] => {
  const [start, end] = visibleRange(panel.cursor, panel.entries.length, height)
  const rows = panel.entries.slice(start, end).map((entry, offset) => {
    const label = cell(entry.isDirectory ? `${entry.name}/` : entry.name, width)
    return start + offset === panel.cursor ? `\x1b[7m${label}\x1b[0m` : label
  })
  const blank = ' '.repeat(width)
  return [...rows, ...Array.from({ length: height - rows.length }, () => blank)]
}

const statusLine = (state: State, columns: number): string => {
  const text = state.prompt ? `${state.prompt.text}${state.prompt.value}_` : state.message
  return `\x1b[2m${cell(text, columns)}\x1b[0m`
}

const render = (state: State): void => {
  const columns = process.stdout.columns || 80
  const rows = Math.max(5, process.stdout.rows || 24)
  const widths = [Math.floor((columns - 1) / 2), columns - 1 - Math.floor((columns - 1) / 2)]
  const height = rows - 3
  const titles = state.panels.map((panel, index) => {
    const text = cell(panel.dir, widths[index])
    return index === state.active ? `\x1b[1;36m${text}\x1b[0m` : text
  })
  const lists = state.panels.map((panel, index) => panelRows(panel, widths[index], height))
  const body = Array.from({ length: height }, (_, row) => `${lists[0][row]}│${lists[1][row]}`)
  const keys = `\x1b[46;30m${cell('5 Copy  6 Move  7 MkDir  8 Delete  10 Quit', columns)}\x1b[0m`
  const lines = [`${titles.join('│')}`, ...body, statusLine(state, columns), keys]
  process.stdout.write(`\x1b[H\x1b[2J${lines.join('\n')}`)
}

async function explorer(folder: string): Promise<void> {
  const state: State = {
    panels: [openPanel(folder), openPanel(folder)],
    active: 0,
    message: '↑↓ move · Tab switch panel · Enter open · Backspace up',
    prompt: null,
  }

  await new Promise<void>((resolve) => {
    const stop = readKeys((input, key) => {
      if (state.prompt) typeInPrompt(state, state.prompt, input, key)
      else if (isQuitKey(input, key) || key.name === 'f10') {
        stop()
        resolve()
        return
      } else command(state, input, key)
      render(state)
    })
    render(state)
  })
  process.stdout.write('\x1b[2J\x1b[H')
}

const tuis: Record<string, (folder: string) => Promise<void>> = {
  explorer,
}

async function main(): Promise<void> {
  const names = Object.keys(tuis)
  const [name, folder] = process.argv.slice(2)
  const tui = tuis[name]
  if (!tui) throw new Error(`Unknown tui "${name ?? ''}". Choose one of: ${names.join(', ')}`)
  await tui(path.resolve(folder ?? '.'))
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  if (!process.argv[2] || process.argv.slice(2).includes('--help') || process.argv.slice(2).includes('-h')) {
    console.log('Usage: hlpr tui run <explorer> [folder]\nexplorer: two panels. Tab switches panel, Enter opens a folder, Backspace goes up.\nF5 copy, F6 move, F7 new folder, F8 delete, F10 or q quits.')
    process.exit(0)
  }
  main().catch((error) => {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  })
}
