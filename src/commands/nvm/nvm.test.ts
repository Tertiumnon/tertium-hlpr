import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

describe('nvm commands', () => {
  test.each(['i.sh', 'use.sh'])('%s requires a version', (script) => {
    const result = spawnSync('bash', ['-s'], { input: readFileSync(new URL(script, import.meta.url), 'utf8'), encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('<-v|-version> <lts|version>')
  }, 15_000)

  test.each(['i.sh', 'use.sh'])('%s accepts -version', (script) => {
    const result = spawnSync('bash', ['-s', '--', '-version', 'invalid'], { input: readFileSync(new URL(script, import.meta.url), 'utf8'), encoding: 'utf8' })
    expect(result.stderr).toContain('Invalid Node.js version: invalid')
  })
})
