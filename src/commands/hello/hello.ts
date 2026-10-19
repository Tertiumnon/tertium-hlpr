#!/usr/bin/env node

// @description Wake up Neo, then display a Matrix rain effect

import { wakeUpNeo } from '../../core/matrix.js'

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  if (process.argv.slice(2).includes('--help') || process.argv.slice(2).includes('-h')) {
    console.log('Usage: hlpr hello')
    process.exit(0)
  }
  wakeUpNeo().catch((error) => {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  })
}
