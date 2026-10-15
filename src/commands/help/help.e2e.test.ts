import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { HLPR_LOGO } from '../../core/command/logo.js'
import { renderHelp } from '../../core/command/help.js'

test('help adds color only when requested', () => {
  const commands = [{ category: 'net', name: 'scan', usages: ['hlpr net scan'] }]
  expect(renderHelp(commands, '1.0.0', false)).not.toContain('\u001b[')
  expect(renderHelp(commands, '1.0.0', true)).toContain('\u001b[1;36m')
})

test('TypeScript commands use domain and command directories', () => {
  const root = 'src/commands'
  expect(readdirSync(`${root}/hello`)).toContain('hello.ts')
  for (const domain of readdirSync(root, { withFileTypes: true }).filter(item => item.isDirectory() && item.name !== 'help' && item.name !== 'hello')) {
    const files = readdirSync(`${root}/${domain.name}`, { withFileTypes: true })
    expect(files.filter(item => item.isFile() && item.name.endsWith('.ts') && !item.name.includes('.test.'))).toEqual([])
    for (const action of files.filter(item => item.isDirectory())) {
      const nested = readdirSync(`${root}/${domain.name}/${action.name}`)
      if (nested.some(file => file.endsWith('.ts') && !file.includes('.test.'))) expect(nested).toContain(`${action.name}.ts`)
    }
  }
})

test('help lists current commands, excludes helpers, and shows the package version', () => {
  const build = spawnSync('bun', ['run', 'build'], { encoding: 'utf8' })
  expect(build.status).toBe(0)
  const pack = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/c', 'npm.cmd', 'pack', '--dry-run', '--ignore-scripts', '--json'], { encoding: 'utf8' })
    : spawnSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], { encoding: 'utf8' })
  expect(pack.status).toBe(0)
  const packResult = JSON.parse(pack.stdout)
  const packageFiles = new Set((Array.isArray(packResult) ? packResult[0] : packResult['@tertium/hlpr']).files.map((file: { path: string }) => file.path))
  for (const command of ['bin/index.js', 'bin/commands/app/list/list.js', 'bin/commands/self/update/update.js', 'bin/commands/self/fix/fix.js']) expect(packageFiles.has(command)).toBe(true)
  const incomplete = mkdtempSync(path.join(os.tmpdir(), 'hlpr-incomplete-'))
  try {
    mkdirSync(path.join(incomplete, 'bin'))
    copyFileSync('bin/index.js', path.join(incomplete, 'bin', 'index.js'))
    writeFileSync(path.join(incomplete, 'package.json'), '{"type":"module"}')
    const help = spawnSync('node', [path.join(incomplete, 'bin', 'index.js'), 'self', 'fix', '--help'], { encoding: 'utf8' })
    expect(help.status).toBe(0)
    expect(help.stdout).toContain('Usage: hlpr self fix')
    const fakeTools = path.join(incomplete, 'tools')
    const log = path.join(incomplete, 'install.log')
    mkdirSync(fakeTools)
    writeFileSync(path.join(fakeTools, process.platform === 'win32' ? 'npm.cmd' : 'npm'), process.platform === 'win32'
      ? '@echo off\r\necho %*>>"%HLPR_FIX_LOG%"\r\n'
      : '#!/bin/sh\nprintf "%s\\n" "$*" >> "$HLPR_FIX_LOG"\n', { mode: 0o755 })
    const repaired = spawnSync(process.execPath, [path.join(incomplete, 'bin', 'index.js'), 'self', 'fix'], {
      encoding: 'utf8', env: { ...process.env, PATH: `${fakeTools}${path.delimiter}${process.env.PATH}`, HLPR_FIX_LOG: log },
    })
    expect(repaired.status).toBe(0)
    expect(readFileSync(log, 'utf8').trim()).toBe('install -g --force @tertium/hlpr@latest')
  } finally {
    rmSync(incomplete, { recursive: true, force: true })
  }
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
  expect(readFileSync('README.md', 'utf8').replace(/\r\n/g, '\n')).toContain(HLPR_LOGO)

  const bare = spawnSync('node', ['bin/index.js'], { encoding: 'utf8' })
  expect(bare.status).toBe(0)
  expect(bare.stdout).toContain('|==|   |==|')
  expect(bare.stdout).toContain(`hlpr v${version}`)
  expect(bare.stdout).toContain('use "hlpr help"')
  const splashLines = bare.stdout.split('\n')
  expect(splashLines.find(line => line.includes('.--------------------.'))?.indexOf('.--------------------.')).toBe(
    splashLines.find(line => line.includes("I'll automate you..."))?.indexOf("I'll automate you..."),
    )
  expect(bare.stdout).not.toMatch(/\nhlpr v/)
  expect(bare.stdout).not.toContain('AVAILABLE COMMANDS')

  for (const args of [['bin/index.js', 'help'], ['bin/index.js', '--help'], ['bin/commands/help/help.js']]) {
    const result = spawnSync('node', args, { encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain(`v${version}`)
    expect(result.stdout).toContain(`hlpr v${version}`)
    expect(result.stdout).not.toContain(HLPR_LOGO)
    expect(result.stdout).not.toContain('(TS)')
    expect(result.stdout).not.toContain('EXAMPLES:')
    expect(result.stdout).not.toContain('\u001b[')
    for (const command of ['file rename', 'file move', 'file find -name <name>', 'file search -name <name>', 'net scan', 'net list -device', 'net status', 'system info', 'battery status', 'disk info', 'memory info', 'git create', 'process list', 'process kill', 'app list', 'app search -name <name>', 'app find -name <name>', 'app remove -name <app name>', 'ssh mkcon', 'ssh mkkey', 'tool install', 'runtime install', 'self update', 'self fix', 'self upgrade', 'hello', 'hello world']) {
      expect(result.stdout).toContain(`hlpr ${command}`)
    }
    expect(result.stdout).toContain('also: hlpr net list -d')
    expect(result.stdout).not.toMatch(/also: (?!hlpr )/)
    for (const obsolete of ['.types', 'hlpr demo ', 'hlpr rename ', 'hlpr mv ', 'hlpr list process', 'hlpr list app', 'hlpr kill process', 'hlpr ssh add connection', 'git precommit', 'git fodd', 'hlpr nvm', 'hlpr net devices']) {
      expect(result.stdout).not.toContain(obsolete)
    }
    expect(result.stdout).toContain('hlpr [options] <domain> <command> [params...]')
    expect(result.stdout).toContain('hlpr git create <-branch|-b> <branch>')
    expect(result.stdout).toContain('hlpr process kill (-id <id> | -port <port>) [options]')
    expect(result.stdout).toContain('hlpr file rename -dir <dir> -style <style> [-r] [-d] [-f]')
    for (const alias of ['battery info', 'net info', 'disk status', 'memory status', 'system status', 'app delete -name <app name>', 'app uninstall -name <app name>', 'file mv', 'git rm']) expect(result.stdout).toContain(`hlpr ${alias}`)
  }
  for (const [category, alias, original] of [['battery', 'info', 'status'], ['net', 'info', 'status'], ['disk', 'status', 'info'], ['memory', 'status', 'info'], ['system', 'status', 'info']]) {
    const result = spawnSync('node', ['bin/index.js', category, alias, '--help'], { encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain(`Usage: hlpr ${category} ${original}`)
    expect(result.stdout).toContain(`Alias: hlpr ${category} ${alias}`)
  }
  const typo = spawnSync('node', ['bin/index.js', 'self', 'ifx'], { encoding: 'utf8' })
  expect(typo.status).toBe(1)
  expect(typo.stderr).toContain('Command not found: hlpr self ifx')
  expect(typo.stderr).not.toContain('.sh')
  for (const [domain, action] of [['file', 'rename'], ['file', 'move'], ['file', 'find'], ['file', 'search'], ['process', 'list'], ['process', 'kill'], ['app', 'list'], ['app', 'search'], ['app', 'find'], ['ssh', 'mkcon'], ['tool', 'install'], ['runtime', 'install'], ['self', 'update'], ['self', 'fix'], ['self', 'upgrade'], ['hello', 'world']]) {
    const result = spawnSync('node', ['bin/index.js', domain, action, '--help'], { encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain(`hlpr ${domain} ${action === 'upgrade' ? 'update' : domain === 'app' && action === 'find' ? 'search' : domain === 'file' && action === 'search' ? 'find' : action}`)
  }
  const hello = spawnSync('node', ['bin/index.js', 'hello', '--help'], { encoding: 'utf8' })
  expect(hello.status).toBe(0)
  expect(hello.stdout).toContain('Usage: hlpr hello')
  const fileFind = spawnSync('node', ['bin/index.js', 'file', 'find', '-name', 'AGENTS.md'], { encoding: 'utf8' })
  expect(fileFind.status).toBe(0)
  expect(fileFind.stdout).toContain('AGENTS.md')
  expect(fileFind.stdout).not.toContain('--- finished by')
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
