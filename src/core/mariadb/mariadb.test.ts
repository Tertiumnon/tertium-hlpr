import { describe, expect, test } from 'bun:test'
import { validateParamName } from '../aws/param-store.js'
import { parseDatabaseUrl, parseFlags, readDatabaseUrl, remoteCommand, sq, sqlString, validateSshConfig } from './mariadb.js'

describe('mariadb core', () => {
  test('parseFlags reads valued flags and switches, and rejects bad input', () => {
    expect(parseFlags(['-a', 'x', '-s'], ['-a'], ['-s'])).toEqual({ '-a': 'x', '-s': true })
    expect(() => parseFlags(['-a'], ['-a'])).toThrow('-a needs a value')
    expect(() => parseFlags(['-a', '-b'], ['-a'])).toThrow('-a needs a value')
    expect(() => parseFlags(['-z'], ['-a'])).toThrow('Unknown or misplaced argument: -z')
    expect(() => parseFlags(['-a', 'x', '-a', 'y'], ['-a'])).toThrow('Repeated flag -a')
    expect(() => parseFlags(['-s', '-s'], [], ['-s'])).toThrow('Repeated flag -s')
  })

  test('sq and sqlString quote for the shell and for SQL', () => {
    expect(sq("it's")).toBe("'it'\\''s'")
    expect(sqlString("it's")).toBe("'it''s'")
    expect(sqlString('a\\b')).toBe("'a\\\\b'")
  })

  test('parseDatabaseUrl keeps host and port as written and decodes credentials', () => {
    expect(parseDatabaseUrl('mysql://app:p%40ss@127.0.0.1/Dungeons', 'tertium')).toEqual({
      ssh: 'tertium', host: '127.0.0.1', port: '3306', user: 'app', password: 'p@ss', database: 'Dungeons',
    })
    expect(parseDatabaseUrl('mariadb://u:p@db:3307/x', 'a').port).toBe('3307')
  })

  test('parseDatabaseUrl rejects other schemes, no database and malformed URLs', () => {
    expect(() => parseDatabaseUrl('postgresql://u:p@h/db', 'a')).toThrow('must be mysql:// or mariadb://')
    expect(() => parseDatabaseUrl('mysql://u:p@h', 'a')).toThrow('names no database')
    expect(() => parseDatabaseUrl('not a url', 'a')).toThrow('not a valid URL')
  })

  test('readDatabaseUrl finds DATABASE_URL in env content, quoted or not', () => {
    expect(readDatabaseUrl('PORT=1\nDATABASE_URL=mysql://u:p@h/db\n')).toBe('mysql://u:p@h/db')
    expect(readDatabaseUrl('DATABASE_URL="mysql://u:p@h/db"')).toBe('mysql://u:p@h/db')
    expect(() => readDatabaseUrl('PORT=1')).toThrow('DATABASE_URL is not set')
  })

  test('remoteCommand puts the password in MYSQL_PWD, not in the arguments', () => {
    const target = parseDatabaseUrl("mysql://u:it's@127.0.0.1:3306/db", 'tertium')
    const command = remoteCommand(target, "'mysqldump'", ['--routines'])
    expect(command.startsWith("MYSQL_PWD='it'\\''s' 'mysqldump' -h '127.0.0.1' -P '3306' -u 'u'")).toBe(true)
    expect(command).not.toContain('-p')
  })

  test('validates SSH config and SSM names', () => {
    expect(validateSshConfig('tertium-deploy', '-ssh-config')).toBe('tertium-deploy')
    expect(() => validateSshConfig('a b', '-ssh-config')).toThrow('Invalid -ssh-config')
    expect(validateParamName('/env/app/env.dev', '-ssm-param')).toBe('/env/app/env.dev')
    expect(() => validateParamName('env/app', '-ssm-param')).toThrow('Invalid -ssm-param')
  })
})
