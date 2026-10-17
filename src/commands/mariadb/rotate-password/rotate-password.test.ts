import { describe, expect, test } from 'bun:test'
import { parseRotateArgs } from './rotate-password.js'

// Host names are used as Host aliases here, so no ~/.ssh/config lookup happens.
const parse = (args: string[]) => parseRotateArgs(args, host => host)
const base = ['-host', 'app-deploy', '-ssm-param', '/env/app/env.prod']

describe('mariadb rotate-password args', () => {
  test('takes the host and the parameter', () => {
    expect(parse(base)).toEqual({ sshConfig: 'app-deploy', paramName: '/env/app/env.prod', dryRun: false })
    expect(parse([...base, '-dry-run'])).toEqual({ sshConfig: 'app-deploy', paramName: '/env/app/env.prod', dryRun: true })
  })

  test('needs the host and the parameter, and rejects anything else', () => {
    expect(() => parse(base.slice(2))).toThrow('Usage: hlpr mariadb rotate-password')
    expect(() => parse(base.slice(0, 2))).toThrow('Usage: hlpr mariadb rotate-password')
    expect(() => parse([...base, '-app-path', '/var/www/x'])).toThrow('Unknown or misplaced argument: -app-path')
  })

  test('validates the parameter name', () => {
    expect(() => parse(['-host', 'a', '-ssm-param', 'env/app'])).toThrow('Invalid -ssm-param')
  })

  test('uses the SSH alias the host resolves to', () => {
    const resolved = parseRotateArgs(base, host => `alias-${host}`)
    expect(resolved.sshConfig).toBe('alias-app-deploy')
  })
})
