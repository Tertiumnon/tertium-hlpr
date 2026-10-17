import { describe, expect, test } from 'bun:test'
import { resolveDatabaseUrl } from '../../../core/mariadb/backup.js'
import { parseBackupArgs } from './backup.js'

// Host names are used as Host aliases here, so no ~/.ssh/config lookup happens.
const parse = (args: string[]) => parseBackupArgs(args, host => host)

describe('mariadb backup args', () => {
  test('takes a URL or an SSM parameter, with defaults for the output', () => {
    expect(parse(['-host', 'drh-mini', '-db-url', 'mysql://u:p@127.0.0.1/app'])).toEqual({
      ssh: 'drh-mini', source: 'mysql://u:p@127.0.0.1/app', backupDir: 'backups', prefix: 'backup',
    })
    expect(parse(['-host', 'tertium', '-ssm-param', '/env/app/env.prod', '-backup-dir', 'b', '-prefix', 'app']))
      .toEqual({ ssh: 'tertium', source: 'ssm:/env/app/env.prod', backupDir: 'b', prefix: 'app' })
  })

  test('needs exactly one of -db-url or -ssm-param', () => {
    expect(() => parse(['-host', 'a'])).toThrow('Give exactly one of -db-url or -ssm-param')
    expect(() => parse(['-host', 'a', '-db-url', 'mysql://u:p@h/db', '-ssm-param', '/env/x'])).toThrow('Give exactly one')
  })

  test('rejects a prefix that is a path', () => {
    expect(() => parse(['-host', 'a', '-db-url', 'mysql://u:p@h/db', '-prefix', '../x'])).toThrow('-prefix must be a file name')
  })

  test('reads the URL from SSM through the injected reader only when asked', () => {
    const read = (name: string) => `# comment\nDATABASE_URL=mysql://u:p@h/${name.split('/')[2]}\n`
    expect(resolveDatabaseUrl('mysql://u:p@h/x', read)).toBe('mysql://u:p@h/x')
    expect(resolveDatabaseUrl('ssm:/env/app/env.dev', read)).toBe('mysql://u:p@h/app')
  })
})
