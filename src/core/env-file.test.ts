import { describe, expect, test } from 'bun:test'
import { quoteEnvValue, readEnvKey, setEnvKey, validateEnvKey } from './env-file.js'

const env = [
  'APP_NAME=dungeons',
  'DB_PASSWORD=old-pass',
  'DB_HOST="127.0.0.1"',
  "DB_USER='app'",
  'export DB_NAME=app # the database',
  '# DB_PASSWORD=commented',
  'DB_PASSWORD_OLD=kept',
  '',
].join('\n')

describe('env file key', () => {
  test('validates the variable name', () => {
    expect(validateEnvKey('DB_PASSWORD')).toBe('DB_PASSWORD')
    expect(() => validateEnvKey('DB-PASSWORD')).toThrow('Invalid -key')
    expect(() => validateEnvKey('1X')).toThrow('Invalid -key')
  })

  test('reads a value without quotes or a trailing comment', () => {
    expect(readEnvKey(env, 'DB_PASSWORD')).toBe('old-pass')
    expect(readEnvKey(env, 'DB_HOST')).toBe('127.0.0.1')
    expect(readEnvKey(env, 'DB_USER')).toBe('app')
    expect(readEnvKey(env, 'DB_NAME')).toBe('app')
  })

  test('replaces exactly the named line and keeps everything else', () => {
    const updated = setEnvKey(env, 'DB_PASSWORD', 'new-pass')
    expect(updated).toBe(env.replace('DB_PASSWORD=old-pass', 'DB_PASSWORD=new-pass'))
    expect(updated).toContain('DB_PASSWORD_OLD=kept')
    expect(updated).toContain('# DB_PASSWORD=commented')
  })

  test('keeps export, indent and CRLF line endings', () => {
    expect(setEnvKey('export DB_NAME=app\r\nX=1\r\n', 'DB_NAME', 'other')).toBe('export DB_NAME=other\r\nX=1\r\n')
    expect(setEnvKey('  DB_NAME=app\n', 'DB_NAME', 'other')).toBe('  DB_NAME=other\n')
  })

  test('quotes values that need it, and refuses ones it cannot write safely', () => {
    expect(quoteEnvValue('Abc123+/=_-')).toBe('Abc123+/=_-')
    expect(quoteEnvValue('pa#ss$word')).toBe("'pa#ss$word'")
    expect(() => quoteEnvValue("it's")).toThrow('cannot be written safely')
    expect(() => quoteEnvValue('a\nb')).toThrow('cannot be written safely')
    expect(() => quoteEnvValue('')).toThrow('empty')
  })

  test('refuses a missing key or one that is set twice, changing nothing', () => {
    expect(() => readEnvKey(env, 'MISSING')).toThrow('No MISSING line in the value')
    expect(() => setEnvKey(env, 'MISSING', 'x')).toThrow('No MISSING line in the value')
    expect(() => setEnvKey('A=1\nA=2\n', 'A', 'x')).toThrow('A is set 2 times')
  })
})
