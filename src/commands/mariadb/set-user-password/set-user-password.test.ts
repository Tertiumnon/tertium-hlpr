import { describe, expect, test } from 'bun:test'
import { alterUserStatement, parseUserPasswordArgs, setUserPassword, sqlString } from './set-user-password.js'

// Host names are used as Host aliases here, so no ~/.ssh/config lookup happens.
const parse = (args: string[]) => parseUserPasswordArgs(args, host => host)

const valid = ['-db-name', 'dungeons', '-db-password', 's3cret', '-host', 'tertium']
// The full target, as main() builds it once the password is known.
const target = () => ({ ...parse(valid), dbPassword: 's3cret' })

describe('mariadb set-user-password', () => {
  test('parses the flags in any order', () => {
    expect(parse(valid)).toEqual({ dbName: 'dungeons', dbPassword: 's3cret', sshConfig: 'tertium' })
    expect(parse(['-host', 'tertium', '-db-password', 's3cret', '-db-name', 'dungeons']))
      .toEqual({ dbName: 'dungeons', dbPassword: 's3cret', sshConfig: 'tertium' })
  })

  test('accepts a password that starts with a dash', () => {
    expect(parse(['-db-name', 'dungeons', '-db-password', '-x-1', '-host', 'tertium']).dbPassword).toBe('-x-1')
  })

  test('requires every flag once and rejects unknown flags', () => {
    expect(() => parse(valid.slice(2))).toThrow('Usage: hlpr mariadb set-user-password')
    expect(() => parse(['-db-name', 'dungeons'])).toThrow('Usage: hlpr mariadb set-user-password')
    expect(parse(['-db-name', 'dungeons', '-host', 'tertium'])).toEqual({ dbName: 'dungeons', dbPassword: undefined, sshConfig: 'tertium' })
    expect(() => parse([...valid, '-db-name', 'other'])).toThrow('Usage: hlpr mariadb set-user-password')
    expect(() => parse([...valid, '-extra', 'x'])).toThrow('Usage: hlpr mariadb set-user-password')
  })

  test('rejects unsafe names and empty or multi-line passwords', () => {
    expect(() => parse(['-db-name', 'dungeons; drop', '-db-password', 'x', '-host', 'tertium'])).toThrow('Invalid -db-name')
    expect(() => parse(['-db-name', 'dungeons', '-db-password', '', '-host', 'tertium'])).toThrow('Invalid -db-password')
    expect(() => parse(['-db-name', 'dungeons', '-db-password', 'a\nb', '-host', 'tertium'])).toThrow('Invalid -db-password')
    expect(() => parse(['-db-name', 'dungeons', '-db-password', 'x', '-host', 'a b'])).toThrow('Invalid -host')
  })

  test('quotes SQL strings, escaping quotes and backslashes', () => {
    expect(sqlString('plain')).toBe("'plain'")
    expect(sqlString("it's")).toBe("'it''s'")
    expect(sqlString('a\\b')).toBe("'a\\\\b'")
    expect(alterUserStatement('dungeons', 'localhost', "p'w")).toBe("ALTER USER 'dungeons'@'localhost' IDENTIFIED BY 'p''w';\n")
  })

  test('changes the password for every host the user is defined on, without putting it in the query', async () => {
    const calls: { sshConfig: string, sql: string }[] = []
    const fake = async (sshConfig: string, sql: string) => {
      calls.push({ sshConfig, sql })
      return sql.startsWith('SELECT') ? 'localhost\n%\n' : ''
    }
    const hosts = await setUserPassword(target(), fake)
    expect(hosts).toEqual(['localhost', '%'])
    expect(calls).toHaveLength(2)
    expect(calls[0].sshConfig).toBe('tertium')
    expect(calls[0].sql).not.toContain('s3cret')
    expect(calls[1].sql).toContain("ALTER USER 'dungeons'@'localhost' IDENTIFIED BY 's3cret';")
    expect(calls[1].sql).toContain("ALTER USER 'dungeons'@'%' IDENTIFIED BY 's3cret';")
  })

  test('fails without changing anything when the user does not exist', async () => {
    const calls: string[] = []
    const fake = async (_sshConfig: string, sql: string) => { calls.push(sql); return '' }
    await expect(setUserPassword(target(), fake)).rejects.toThrow('No MariaDB user "dungeons" on tertium')
    expect(calls).toHaveLength(1)
  })
})
