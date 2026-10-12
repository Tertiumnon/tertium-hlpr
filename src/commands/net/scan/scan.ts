#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

// @description Show local TCP/UDP ports and their processes

export function scanCommand(platform: NodeJS.Platform): { command: string; args: string[] } {
  if (platform === 'win32') return { command: 'netstat', args: ['-ano'] }
  if (platform === 'linux') return { command: 'ss', args: ['-tunap'] }
  if (platform === 'darwin') return { command: 'lsof', args: ['-nP', '-iTCP', '-iUDP'] }
  throw new Error(`Port scanning is not supported on ${platform}`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log('Usage: hlpr net scan')
    console.log('Show local TCP/UDP ports, connections, and process IDs where available.')
    process.exit(0)
  }
  if (args.length > 0) {
    console.error('Usage: hlpr net scan')
    process.exit(1)
  }

  try {
    const { command, args: commandArgs } = scanCommand(process.platform)
    const result = spawnSync(command, commandArgs, { encoding: 'utf8' })
    if (result.error) throw result.error
    // lsof returns 1 when no matching sockets are visible.
    if (command === 'lsof' && result.status === 1 && !result.stdout && !result.stderr) {
      console.log('No TCP/UDP ports found.')
    } else {
      if (result.status !== 0) throw new Error(result.stderr.trim() || `${command} failed with exit code ${result.status}`)
      process.stdout.write(result.stdout)
      process.stderr.write(result.stderr)
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}
