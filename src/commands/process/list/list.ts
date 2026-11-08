#!/usr/bin/env node
import { formatTable, listProcesses } from './list.utils.js'

// @description List running processes

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log('Usage: hlpr process list')
    console.log('List running processes')
    process.exit(0)
  }

  try {
    console.log(formatTable(listProcesses()))
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}
