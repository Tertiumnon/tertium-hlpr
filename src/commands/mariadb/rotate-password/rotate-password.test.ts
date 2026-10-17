import { describe, expect, test } from 'bun:test'
import { parseRotateArgs } from './rotate-password.js'

// Host names are used as Host aliases here, and the parameter is read from this fake, so nothing reaches AWS or ~/.ssh.
const ENV = 'DEPLOY_USER=deploy\nDEPLOY_HOST=tertium\nDATABASE_URL=mysql://app:x@127.0.0.1/Dungeons\n'
const deps = { resolve: (host: string) => host, readParameter: () => ENV }
const parse = (args: string[]) => parseRotateArgs(args, deps)
const base = ['-ssh-host', 'app-deploy', '-ssm-param', '/env/app/env.prod']

describe('mariadb rotate-password args', () => {
  test('takes the host and the parameter', () => {
    expect(parse(base)).toEqual({ sshConfig: 'app-deploy', paramName: '/env/app/env.prod', dryRun: false })
    expect(parse([...base, '-dry-run'])).toEqual({ sshConfig: 'app-deploy', paramName: '/env/app/env.prod', dryRun: true })
  })

  test('without -host, the host is the one the parameter names', () => {
    expect(parse(['-ssm-param', '/env/app/env.prod']).sshConfig).toBe('deploy@tertium')
  })

  test('needs -ssm-param, and rejects anything else', () => {
    expect(() => parse(['-ssh-host', 'app-deploy'])).toThrow('Usage: hlpr mariadb rotate-password')
    expect(() => parse([...base, '-app-path', '/var/www/x'])).toThrow('Unknown or misplaced argument: -app-path')
  })

  test('validates the parameter name', () => {
    expect(() => parse(['-ssh-host', 'a', '-ssm-param', 'env/app'])).toThrow('Invalid -ssm-param')
  })

  test('uses the SSH alias the host resolves to', () => {
    const resolved = parseRotateArgs(base, { resolve: host => `alias-${host}`, readParameter: () => ENV })
    expect(resolved.sshConfig).toBe('alias-app-deploy')
  })
})
