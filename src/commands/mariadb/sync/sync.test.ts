import { describe, expect, test } from 'bun:test'
import { parseSyncArgs } from './sync.js'

// Host names are used as Host aliases here, and the parameters are read from this fake, so nothing reaches AWS or ~/.ssh.
const ENV = 'DEPLOY_USER=deploy\nDEPLOY_HOST=tertium\nDATABASE_URL=mysql://app:x@127.0.0.1/app\n'
const deps = { resolve: (host: string) => host, readParameter: () => ENV }
const parse = (args: string[]) => parseSyncArgs(args, deps)

const base = ['-from-ssh-host', 'drh-mini', '-from-ssm-param', '/env/app/env.dev', '-to-ssh-host', 'tertium', '-to-db-url', 'mysql://u:p@127.0.0.1/app']

describe('mariadb sync args', () => {
  test('parses both sides, each from an SSM parameter or a URL', () => {
    expect(parse(base)).toEqual({
      from: { ssh: 'drh-mini', source: 'ssm:/env/app/env.dev' },
      to: { ssh: 'tertium', source: 'mysql://u:p@127.0.0.1/app' },
      dryRun: false,
      skipBackup: false,
      backupDir: 'backups',
    })
  })

  test('accepts -dry-run, -skip-backup and -backup-dir', () => {
    const parsed = parse([...base, '-dry-run', '-skip-backup', '-backup-dir', 'tmp'])
    expect(parsed.dryRun).toBe(true)
    expect(parsed.skipBackup).toBe(true)
    expect(parsed.backupDir).toBe('tmp')
  })

  test('a side needs one source: a URL or an SSM parameter', () => {
    expect(() => parse(['-from-ssh-host', 'drh-mini', '-to-ssh-host', 'tertium', '-to-db-url', 'mysql://u:p@h/db'])).toThrow('Usage: hlpr mariadb sync')
    expect(() => parse([...base, '-from-db-url', 'mysql://u:p@h/db'])).toThrow('Give exactly one of -from-db-url or -from-ssm-param')
  })

  test('without -from-host / -to-host, each host is the one its parameter names', () => {
    const parsed = parse(['-from-ssm-param', '/env/app/env.dev', '-to-ssm-param', '/env/app/env.prod'])
    expect(parsed.from.ssh).toBe('deploy@tertium')
    expect(parsed.to.ssh).toBe('deploy@tertium')
  })

  test('rejects unknown flags', () => {
    expect(() => parse([...base, '-yes'])).toThrow('Unknown or misplaced argument: -yes')
  })

  test('resolves each host with the lookup', () => {
    const resolved = parseSyncArgs(base, { resolve: host => `alias-${host}`, readParameter: () => ENV })
    expect(resolved.from.ssh).toBe('alias-drh-mini')
    expect(resolved.to.ssh).toBe('alias-tertium')
  })
})
