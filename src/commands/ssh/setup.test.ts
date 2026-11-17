import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

test('shows setup help successfully', () => {
  const result = spawnSync('bash', [path.join(import.meta.dir, 'setup.sh'), '--help'], { encoding: 'utf8' })
  expect(result.status).toBe(0)
  expect(result.stdout).toContain('Usage: hlpr ssh setup')
})
