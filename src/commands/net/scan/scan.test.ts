import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { scanCommand } from './scan.js'

const script = fileURLToPath(new URL('scan.ts', import.meta.url))

describe('net scan', () => {
  test('selects numeric TCP/UDP socket listings with process information', () => {
    expect(scanCommand('win32')).toEqual({ command: 'netstat', args: ['-ano'] })
    expect(scanCommand('linux')).toEqual({ command: 'ss', args: ['-tunap'] })
    expect(scanCommand('darwin')).toEqual({ command: 'lsof', args: ['-nP', '-iTCP', '-iUDP'] })
    expect(() => scanCommand('freebsd')).toThrow('not supported')
  })

  test('shows help and rejects unexpected arguments', () => {
    const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' })
    expect(help.status).toBe(0)
    expect(help.stdout).toContain('Usage: hlpr net scan')
    const invalid = spawnSync(process.execPath, [script, 'example.com'], { encoding: 'utf8' })
    expect(invalid.status).toBe(1)
    expect(invalid.stderr).toContain('Usage: hlpr net scan')
  })

  test('finds a local listening port', async () => {
    const server = createServer()
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', resolve)
      })
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Expected a TCP address')
      const result = spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 10_000 })
      expect(result.status).toBe(0)
      expect(result.stdout).toContain(`127.0.0.1:${address.port}`)
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  }, 15_000)
})
