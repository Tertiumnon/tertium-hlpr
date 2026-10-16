import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'
import { findProcessesAt, killPath, parseKillTarget } from './kill.js'

describe('process kill', () => {
  test('parses process ID and port targets', () => {
    expect(parseKillTarget(['-id', '123'])).toEqual({ id: 123 })
    expect(parseKillTarget(['-port', '3000'])).toEqual({ port: 3000 })
    expect(() => parseKillTarget(['-id', '1', '-port', '2'])).toThrow()
  })

  test('parses folder, file and path targets as the same path', () => {
    for (const flag of ['-folder', '-file', '-path', '--path']) {
      expect(parseKillTarget([flag, 'some-dir'])).toEqual({ path: resolve('some-dir') })
    }
    expect(() => parseKillTarget(['-file'])).toThrow('Missing file path')
    expect(() => parseKillTarget(['-id', '1', '-path', 'x'])).toThrow()
  })

  test('finds a process started inside a temporary folder', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hlpr-kill-'))
    // Windows matches the executable path, so copy a real exe in; POSIX matches the working directory
    const exe = process.platform === 'win32' ? join(dir, 'ping.exe') : process.execPath
    if (process.platform === 'win32') copyFileSync(join(process.env.SystemRoot ?? 'C:/Windows', 'System32', 'ping.exe'), exe)
    const args = process.platform === 'win32' ? ['-n', '100', '127.0.0.1'] : ['-e', 'setInterval(() => {}, 1000)']
    const child = spawn(exe, args, { cwd: dir, stdio: 'ignore' })
    const exited = once(child, 'exit')
    try {
      await new Promise((done) => setTimeout(done, 500))
      expect(findProcessesAt(dir)).toContain(child.pid as number)
      // Console processes on Windows only end with /F, the same as kill -id
      const result = await killPath(dir, { force: true })
      expect(result.killed).toContain(child.pid as number)
    } finally {
      child.kill()
      // Windows keeps the exe locked until the process has fully exited
      await exited
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
