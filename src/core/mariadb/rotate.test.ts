import { describe, expect, test } from 'bun:test'
import type { Parameter } from '../aws/param-store.js'
import { generatePassword, replaceDatabaseUrl, type RotateOptions, type RotateSystem, rotatePassword, withPassword } from './rotate.js'

const OLD = 'oldpassword'
const NEW = 'NEWPASSWORD123'
const URL_OLD = `mysql://app:${OLD}@127.0.0.1:3306/Dungeons`
const PARAM_TEXT = `# prod\nPORT=12120\nDATABASE_URL="${URL_OLD}"\nSECRET=keep-me\n`

const options: RotateOptions = { sshConfig: 'app-deploy', paramName: '/env/app/env.prod', dryRun: false }

// A fake world: one database password and one parameter. Every effect is recorded in order.
function world(overrides: { loginFails?: boolean, paramWriteFails?: boolean } = {}) {
  const events: string[] = []
  const logs: string[] = []
  let dbPassword = OLD
  let param: Parameter = { name: '/env/app/env.prod', type: 'SecureString', value: PARAM_TEXT, version: 4 }
  const system: RotateSystem = {
    readParameter: () => param,
    writeParameter: (current, value) => {
      events.push('param')
      if (overrides.paramWriteFails && value.includes(NEW)) throw new Error('AccessDenied')
      param = { ...current, value, version: current.version + 1 }
      return param.version
    },
    alterPassword: async (_ssh, _user, password) => {
      events.push(password === NEW ? 'alter:new' : 'alter:old')
      dbPassword = password
      return ['localhost', '%']
    },
    canLogin: async target => {
      events.push('login')
      return !overrides.loginFails && target.password === dbPassword
    },
    newPassword: () => NEW,
    log: message => logs.push(message),
  }
  return { system, events, logs, state: () => ({ dbPassword, param }) }
}

describe('password generation and URL edits', () => {
  test('generates letters and digits only, of the requested length', () => {
    const password = generatePassword(40)
    expect(password).toMatch(/^[A-Za-z0-9]{40}$/)
    expect(generatePassword(40)).not.toBe(password)
  })

  test('replaces only the password of a URL', () => {
    expect(withPassword('mysql://app:old@10.0.0.5:3307/db', NEW)).toBe(`mysql://app:${NEW}@10.0.0.5:3307/db`)
  })

  test('replaces DATABASE_URL in an env file and keeps the quotes and the other lines', () => {
    expect(replaceDatabaseUrl(PARAM_TEXT, 'mysql://a:b@h/db')).toBe('# prod\nPORT=12120\nDATABASE_URL="mysql://a:b@h/db"\nSECRET=keep-me\n')
    expect(replaceDatabaseUrl('DATABASE_URL=mysql://a:b@h/db', 'mysql://c:d@h/db')).toBe('DATABASE_URL=mysql://c:d@h/db')
    expect(() => replaceDatabaseUrl('PORT=1\n', 'mysql://a:b@h/db')).toThrow('DATABASE_URL is not set')
  })
})

describe('rotatePassword', () => {
  test('changes the database, then the parameter', async () => {
    const { system, events, state, logs } = world()
    const result = await rotatePassword(options, system)
    expect(events).toEqual(['alter:new', 'login', 'param'])
    expect(result).toEqual({ dbName: 'Dungeons', hosts: ['localhost', '%'], paramVersion: 5 })
    expect(state().dbPassword).toBe(NEW)
    expect(state().param.value).toContain(`DATABASE_URL="mysql://app:${NEW}@127.0.0.1:3306/Dungeons"`)
    expect(state().param.value).toContain('SECRET=keep-me')
    expect(logs.join('\n')).not.toContain(NEW)
  })

  test('dry run changes nothing', async () => {
    const { system, events, logs } = world()
    expect(await rotatePassword({ ...options, dryRun: true }, system)).toBeUndefined()
    expect(events).toEqual([])
    expect(logs.join('\n')).toContain('Dry run')
  })

  test('a failed login rolls the database back and leaves the parameter alone', async () => {
    const { system, events, state } = world({ loginFails: true })
    await expect(rotatePassword(options, system)).rejects.toThrow('rolled back where possible: The new password does not log in')
    expect(events).toEqual(['alter:new', 'login', 'alter:old'])
    expect(state().dbPassword).toBe(OLD)
    expect(state().param.value).toBe(PARAM_TEXT)
  })

  test('a failed parameter write rolls the database back', async () => {
    const { system, events, state } = world({ paramWriteFails: true })
    await expect(rotatePassword(options, system)).rejects.toThrow('AccessDenied')
    expect(events).toEqual(['alter:new', 'login', 'param', 'alter:old'])
    expect(state().dbPassword).toBe(OLD)
  })

  test('a failing rollback is logged and the message names what failed', async () => {
    const { system, logs } = world({ loginFails: true })
    const brokenRollback = { ...system, alterPassword: async (_ssh: string, _user: string, password: string) => {
      if (password === OLD) throw new Error('connection refused')
      return ['%']
    } }
    await expect(rotatePassword(options, brokenRollback)).rejects.toThrow('rolled back where possible')
    expect(logs.some(line => line.includes('Could not roll back database password: connection refused'))).toBe(true)
  })
})
