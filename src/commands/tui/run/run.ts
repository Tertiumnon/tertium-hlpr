#!/usr/bin/env node

// @description Run a small full-screen terminal app: browse

import * as fs from 'node:fs'
import * as path from 'node:path'
import { isQuitKey, readKeys } from '../../../core/terminal.js'

export interface Entry {
  name: string
  isDirectory: boolean
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

function render(dir: string, entries: Entry[], cursor: number, message: string): void {
  const columns = process.stdout.columns || 80
  const height = Math.max(3, (process.stdout.rows || 24) - 3)
  const [start, end] = visibleRange(cursor, entries.length, height)
  const lines = [`\x1b[1;36m${dir}\x1b[0m`]
  for (let index = start; index < end; index++) {
    const entry = entries[index]
    const label = (entry.isDirectory ? `${entry.name}/` : entry.name).slice(0, columns).padEnd(columns)
    lines.push(index === cursor ? `\x1b[7m${label}\x1b[0m` : label)
  }
  const footer = message || '↑↓ move · Enter open · ← Backspace up · q or Esc quit'
  process.stdout.write(`\x1b[H\x1b[2J${lines.join('\n')}\n\x1b[2m${footer}\x1b[0m`)
}

async function browse(start: string): Promise<void> {
  let dir = start
  let entries = readEntries(dir)
  let cursor = 0
  let message = ''

  await new Promise<void>((resolve) => {
    const stop = readKeys((input, key) => {
      if (isQuitKey(input, key)) {
        stop()
        resolve()
        return
      }
      const selected = entries[cursor]
      if (key.name === 'up' || input === 'k') cursor = Math.max(0, cursor - 1)
      else if (key.name === 'down' || input === 'j') cursor = Math.max(0, Math.min(entries.length - 1, cursor + 1))
      else if (['return', 'right'].includes(key.name ?? '') && selected?.isDirectory) {
        try {
          dir = path.join(dir, selected.name)
          entries = readEntries(dir)
          cursor = 0
          message = ''
        } catch (error) {
          message = `Cannot open ${selected.name}: ${error instanceof Error ? error.message : error}`
        }
      } else if (['left', 'backspace'].includes(key.name ?? '') && path.dirname(dir) !== dir) {
        const previous = path.basename(dir)
        dir = path.dirname(dir)
        entries = readEntries(dir)
        cursor = Math.max(0, entries.findIndex(entry => entry.name === previous))
        message = ''
      }
      render(dir, entries, cursor, message)
    })
    render(dir, entries, cursor, message)
  })
  process.stdout.write('\x1b[2J\x1b[H')
}

const tuis: Record<string, (folder: string) => Promise<void>> = {
  browse,
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
    console.log('Usage: hlpr tui run <browse> [folder]\nbrowse: move with arrows, Enter opens a folder, Backspace goes up, q or Esc quits.')
    process.exit(0)
  }
  main().catch((error) => {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  })
}
