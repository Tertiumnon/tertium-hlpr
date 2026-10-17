import { describe, expect, test } from 'bun:test'
import { parseSyncArgs } from './sync.js'

// Host names are used as Host aliases here, so no ~/.ssh/config lookup happens.
const parse = (args: string[]) => parseSyncArgs(args, host => host)

const base = ['-from-host', 'drh-mini', '-from-ssm-param', '/env/app/env.dev', '-to-host', 'tertium', '-to-db-url', 'mysql://u:p@127.0.0.1/app']

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

  test('needs exactly one source per side', () => {
    expect(() => parse(base.filter((_, i) => i !== 2 && i !== 3))).toThrow('Give exactly one of -from-db-url or -from-ssm-param')
    expect(() => parse([...base, '-from-db-url', 'mysql://u:p@h/db'])).toThrow('Give exactly one of -from-db-url or -from-ssm-param')
  })

  test('requires both hosts and rejects unknown flags', () => {
    expect(() => parse(base.slice(2))).toThrow('Usage: hlpr mariadb sync')
    expect(() => parse([...base, '-yes'])).toThrow('Unknown or misplaced argument: -yes')
  })

  test('resolves each host with the lookup', () => {
    const resolved = parseSyncArgs(base, host => `alias-${host}`)
    expect(resolved.from.ssh).toBe('alias-drh-mini')
    expect(resolved.to.ssh).toBe('alias-tertium')
  })
})
