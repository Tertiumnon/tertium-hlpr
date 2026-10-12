#!/usr/bin/env node
import readline from 'node:readline'
import { installedApps } from '../../../core/command/apps.js'

// @description List installed app names, ten at a time

export function pageNames(names: string[], page: number): string[] {
  return names.slice(page * 10, page * 10 + 10)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length === 1 && (args[0] === '-h' || args[0] === '--help')) {
    console.log('Usage: hlpr app list\nNext page: Right arrow or n. Previous page: Left arrow or p. Quit: q or Esc.')
    return
  }
  if (args.length) throw new Error('Usage: hlpr app list')

  const names = [...new Set(installedApps(process.platform).map(app => app.name))].sort((a, b) => a.localeCompare(b))
  if (!names.length) { console.log('No installed apps found.'); return }
  const pageCount = Math.ceil(names.length / 10)
  const interactive = process.stdin.isTTY && process.stdout.isTTY
  let page = 0
  const show = () => {
    console.log(pageNames(names, page).join('\n'))
    if (pageCount > 1 && interactive) console.log(`Page ${page + 1}/${pageCount} (→/n next, ←/p previous, q quit)`)
  }
  show()
  if (pageCount === 1 || !interactive) return

  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  try {
    await new Promise<void>(resolve => {
      const onKeypress = (input: string, key: { name?: string; ctrl?: boolean }) => {
        if (input === 'q' || key.name === 'escape' || (key.ctrl && key.name === 'c')) {
          process.stdin.off('keypress', onKeypress)
          resolve()
        } else if ((input === 'n' || key.name === 'right') && page < pageCount - 1) {
          page++
          show()
        } else if ((input === 'p' || key.name === 'left') && page > 0) {
          page--
          show()
        }
      }
      process.stdin.on('keypress', onKeypress)
    })
  } finally {
    process.stdin.setRawMode(false)
    process.stdin.pause()
  }
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) main().catch(error => {
  console.error(`Error: ${error.message}`)
  process.exitCode = 1
})
