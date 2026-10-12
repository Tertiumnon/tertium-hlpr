import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { HLPR_LOGO } from '../../core/command/logo.js'

test('help lists current commands, excludes helpers, and shows the package version', () => {
  const build = spawnSync('bun', ['run', 'build'], { encoding: 'utf8' })
  expect(build.status).toBe(0)
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
  expect(readFileSync('README.md', 'utf8').replace(/\r\n/g, '\n')).toContain(HLPR_LOGO)

  const bare = spawnSync('node', ['bin/index.js'], { encoding: 'utf8' })
  expect(bare.status).toBe(0)
  expect(bare.stdout).toContain(HLPR_LOGO)
  expect(bare.stdout).toContain('use "hlpr help"')
  expect(bare.stdout).not.toContain('AVAILABLE COMMANDS')

  for (const args of [['bin/index.js', 'help'], ['bin/index.js', '--help'], ['bin/commands/help/help.js']]) {
    const result = spawnSync('node', args, { encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain(`v${version}`)
    expect(result.stdout).toContain(HLPR_LOGO)
    for (const command of ['rename', 'mv', 'net scan', 'net list -device', 'net status', 'system info', 'battery status', 'disk info', 'memory info', 'git create', 'list process', 'kill process', 'update', 'upgrade']) {
      expect(result.stdout).toContain(`hlpr ${command}`)
    }
    for (const obsolete of ['.types', 'hlpr file ', 'hlpr process ', 'git precommit', 'git fodd', 'nvm lts', 'hlpr net devices']) {
      expect(result.stdout).not.toContain(obsolete)
    }
    expect(result.stdout).toContain('hlpr [options] <command> [args...]')
    expect(result.stdout).toContain('hlpr git create -b <branch>')
    expect(result.stdout).toContain('hlpr kill process -port <port>')
    expect(result.stdout).toContain('hlpr rename -dir <dir> -style <style> [-r] [-d] [-f]')
  }
  for (const flag of ['-device', '-d']) {
    const result = spawnSync('node', ['bin/index.js', 'net', 'list', flag], { encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/--- finished by \d+\.\d{2}s ---\s*$/)
    expect(result.stdout).not.toContain('Executing')
    expect(result.stdout).not.toContain('Command completed successfully!')
  }
  const status = spawnSync('node', ['bin/index.js', 'net', 'status'], { encoding: 'utf8' })
  expect(status.status).toBe(0)
  expect(status.stdout).toMatch(/--- finished by \d+\.\d{2}s ---\s*$/)
  const battery = spawnSync('node', ['bin/index.js', 'battery', 'status'], { encoding: 'utf8' })
  expect(battery.status).toBe(0)
  expect(battery.stdout).toMatch(/--- finished by \d+\.\d{2}s ---\s*$/)
}, 30_000)
