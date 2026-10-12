#!/usr/bin/env node

// @description Display animated Hello World ASCII art

export const HELLO_WORLD_ART = [
  ' _   _      _ _        __        __         _     _ ',
  '| | | | ___| | | ___   \\ \\      / /__  _ __| | __| |',
  '| |_| |/ _ \\ | |/ _ \\   \\ \\ /\\ / / _ \\| \'__| |/ _` |',
  '|  _  |  __/ | | (_) |   \\ V  V / (_) | |  | | (_| |',
  '|_| |_|\\___|_|_|\\___/     \\_/\\_/ \\___/|_|  |_|\\__,_|',
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function main(): Promise<void> {
  process.stdout.write('\x1b[2J\x1b[H')
  for (const [index, line] of HELLO_WORLD_ART.entries()) {
    process.stdout.write(`\x1b[${index % 2 ? '96' : '36'}m${line}\x1b[0m\n`)
    await sleep(140)
  }
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  })
}
