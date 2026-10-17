import { describe, expect, test } from 'bun:test'
import { resolveDatabaseUrl } from '../../../core/mariadb/backup.js'
import { parseBackupArgs } from './backup.js'

// Host names are used as Host aliases here, and the parameter is read from this fake, so nothing reaches AWS or ~/.ssh.
const ENV = 'DEPLOY_USER=deploy\nDEPLOY_HOST=tertium\nDATABASE_URL=mysql://u:p@127.0.0.1/app\n'
const deps = { resolve: (host: string) => host, readParameter: () => ENV }
const parse = (args: string[]) => parseBackupArgs(args, deps)

describe('mariadb backup args', () => {
  test('takes a URL or an SSM parameter, with defaults for the output', () => {
    expect(parse(['-ssh-host', 'drh-mini', '-db-url', 'mysql://u:p@127.0.0.1/app'])).toEqual({
      ssh: 'drh-mini', source: 'mysql://u:p@127.0.0.1/app', backupDir: 'backups', prefix: 'backup',
    })
    expect(parse(['-ssh-host', 'tertium', '-ssm-param', '/env/app/env.prod', '-backup-dir', 'b', '-prefix', 'app']))
      .toEqual({ ssh: 'tertium', source: 'ssm:/env/app/env.prod', backupDir: 'b', prefix: 'app' })
  })

  test('without -host, the host is the one the parameter names', () => {
    expect(parse(['-ssm-param', '/env/app/env.prod']).ssh).toBe('deploy@tertium')
  })

  test('needs a source: -db-url or -ssm-param, and not both', () => {
    expect(() => parse(['-ssh-host', 'a'])).toThrow('Usage: hlpr mariadb backup')
    expect(() => parse(['-ssh-host', 'a', '-db-url', 'mysql://u:p@h/db', '-ssm-param', '/env/x'])).toThrow('Give exactly one of -db-url or -ssm-param')
    expect(() => parse(['-db-url', 'mysql://u:p@h/db'])).toThrow('Give -ssh-host')
  })

  test('rejects a prefix that is a path', () => {
    expect(() => parse(['-ssh-host', 'a', '-db-url', 'mysql://u:p@h/db', '-prefix', '../x'])).toThrow('-prefix must be a file name')
  })

  test('reads the URL from SSM through the injected reader only when asked', () => {
    const read = (name: string) => `# comment\nDATABASE_URL=mysql://u:p@h/${name.split('/')[2]}\n`
    expect(resolveDatabaseUrl('mysql://u:p@h/x', read)).toBe('mysql://u:p@h/x')
    expect(resolveDatabaseUrl('ssm:/env/app/env.dev', read)).toBe('mysql://u:p@h/app')
  })
})
