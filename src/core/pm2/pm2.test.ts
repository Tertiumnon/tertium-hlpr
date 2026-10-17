import { describe, expect, test } from 'bun:test'
import { parsePm2Args, parsePm2Status, pm2Command, quote, remoteShell, validateConfigFile, validatePm2Name, validateRemoteDir } from './pm2.js'

// Host names are used as Host aliases here, so no ~/.ssh/config lookup happens.
const resolve = (host: string) => host

describe('pm2 args', () => {
  test('restart, stop and status take -host and -name', () => {
    for (const action of ['restart', 'stop', 'status'] as const) {
      expect(parsePm2Args(action, ['-ssh-host', 'app-deploy', '-name', 'app'], 'usage', { resolve }))
        .toEqual({ sshConfig: 'app-deploy', name: 'app' })
    }
  })

  test('start takes -host, -dir and -config and no name', () => {
    expect(parsePm2Args('start', ['-dir', '/var/www/app', '-ssh-host', 'drh-mini', '-config', 'pm2.config.cjs'], 'usage', { resolve }))
      .toEqual({ sshConfig: 'drh-mini', dir: '/var/www/app', config: 'pm2.config.cjs' })
  })

  test('reports the usage line when a required flag is missing or unknown', () => {
    expect(() => parsePm2Args('restart', ['-ssh-host', 'a'], 'Usage: hlpr pm2 restart', { resolve })).toThrow('Usage: hlpr pm2 restart')
    expect(() => parsePm2Args('start', ['-ssh-host', 'a', '-dir', '/x'], 'Usage: hlpr pm2 start', { resolve })).toThrow('Usage: hlpr pm2 start')
    expect(() => parsePm2Args('stop', ['-ssh-host', 'a', '-name', 'x', '-force'], 'Usage: hlpr pm2 stop', { resolve })).toThrow('Unknown or misplaced argument: -force')
  })

  test('validates the name, the directory and the config file', () => {
    expect(() => parsePm2Args('restart', ['-ssh-host', 'a', '-name', 'x y'], 'u', { resolve })).toThrow('Invalid -name')
    expect(() => parsePm2Args('start', ['-ssh-host', 'a', '-dir', 'var/x', '-config', 'pm2.config.cjs'], 'u', { resolve })).toThrow('Invalid -dir')
    expect(() => parsePm2Args('start', ['-ssh-host', 'a', '-dir', '/var/x', '-config', '--x'], 'u', { resolve })).toThrow('-config needs a value')
    expect(() => parsePm2Args('start', ['-ssh-host', 'a', '-dir', '/var/x', '-config', 'a b'], 'u', { resolve })).toThrow('Invalid -config')
    expect(() => parsePm2Args('restart', ['-ssh-host', 'bad host', '-name', 'x'], 'u', { resolve })).toThrow('Invalid -ssh-host')
  })

  test('the validators accept what pm2 and paths normally use', () => {
    expect(validatePm2Name('dragons-legends-core-api')).toBe('dragons-legends-core-api')
    expect(validateRemoteDir('/var/www/app_2')).toBe('/var/www/app_2')
    expect(validateConfigFile('ecosystem/pm2.config.cjs')).toBe('ecosystem/pm2.config.cjs')
  })
})

describe('pm2 commands on the host', () => {
  test('builds the pm2 line for each action', () => {
    expect(pm2Command('restart', 'app')).toBe("pm2 restart 'app' --update-env")
    expect(pm2Command('stop', 'app')).toBe("pm2 stop 'app'")
    expect(pm2Command('start', undefined, { dir: '/var/www/app', config: 'pm2.config.cjs' })).toBe("cd '/var/www/app' && pm2 start 'pm2.config.cjs'")
    expect(pm2Command('status')).toBe('pm2 jlist')
  })

  test('wraps the line for the remote shell, quoting its single quotes', () => {
    expect(quote("it's")).toBe("'it'\\''s'")
    const wrapped = remoteShell("pm2 restart 'app' --update-env")
    expect(wrapped).toContain('zsh -i -c')
    expect(wrapped).toContain('sh -lc')
    expect(wrapped).toContain(`'pm2 restart '\\''app'\\'' --update-env'`)
  })
})

describe('pm2 status parsing', () => {
  test('reads the status of the named process and ignores shell noise before the list', () => {
    const output = 'zsh: compinit warning\n[{"name":"api","pm2_env":{"status":"online"}},{"name":"web","pm2_env":{"status":"errored"}}]'
    expect(parsePm2Status(output, 'api')).toBe('online')
    expect(parsePm2Status(output, 'web')).toBe('errored')
    expect(parsePm2Status(output, 'missing')).toBe('missing')
  })

  test('fails when pm2 printed no list', () => {
    expect(() => parsePm2Status('pm2: command not found', 'api')).toThrow('pm2 jlist printed no process list')
  })
})
