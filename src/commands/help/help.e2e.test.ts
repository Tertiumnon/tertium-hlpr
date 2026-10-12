import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { HLPR_LOGO } from '../../core/command/logo.js'

test('help lists current commands, excludes helpers, and shows the package version', () => {
  const build = spawnSync('bun', ['run', 'build'], { encoding: 'utf8' })
  expect(build.status).toBe(0)
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
  expect(readFileSync('README.md', 'utf8').replace(/\r\n/g, '\n')).toContain(HLPR_LOGO)

  for (const args of [['bin/index.js'], ['bin/index.js', 'help'], ['bin/index.js', '--help'], ['bin/commands/help/help.js']]) {
    const result = spawnSync('node', args, { encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain(`v${version}`)
    expect(result.stdout).toContain(HLPR_LOGO)
    for (const command of ['rename', 'mv', 'net scan', 'net list -device', 'system info', 'disk info', 'git create', 'list process', 'kill process', 'update', 'upgrade']) {
      expect(result.stdout).toContain(`hlpr ${command}`)
    }
    for (const obsolete of ['.types', 'hlpr file ', 'hlpr process ', 'git precommit', 'git fodd', 'nvm lts', 'hlpr net devices']) {
      expect(result.stdout).not.toContain(obsolete)
    }
    expect(result.stdout).toContain('hlpr [options] <command> [args...]')
  }
  for (const flag of ['-device', '-d']) {
    const result = spawnSync('node', ['bin/index.js', 'net', 'list', flag], { encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(result.stdout.trim().endsWith('Done!')).toBe(true)
    expect(result.stdout).not.toContain('Executing')
    expect(result.stdout).not.toContain('Command completed successfully!')
  }
  const obsolete = spawnSync('node', ['bin/index.js', 'net', 'devices'], { encoding: 'utf8' })
  expect(obsolete.status).toBe(1)
}, 30_000)
