import { describe, expect, test } from 'bun:test'
import { destinationFor, sshHostAndUserFromEnv, validateSshDestination } from './destination.js'

const ENV = 'DEPLOY_USER=deploy\nDEPLOY_HOST=tertium\nPORT=1\n'
const resolve = (host: string) => host
const noRead = () => { throw new Error('the parameter should not be read') }

describe('host and user from an env value', () => {
  test('uses the deploy user and host', () => {
    expect(sshHostAndUserFromEnv(ENV)).toEqual({ host: 'tertium', user: 'deploy' })
  })

  test('the DB_SSH keys win over the deploy keys, each on its own', () => {
    expect(sshHostAndUserFromEnv(`${ENV}DB_SSH_HOST=db1\n`)).toEqual({ host: 'db1', user: 'deploy' })
    expect(sshHostAndUserFromEnv(`${ENV}DB_SSH_USER=dba\nDB_SSH_HOST=db1\n`)).toEqual({ host: 'db1', user: 'dba' })
  })

  test('missing keys are undefined', () => {
    expect(sshHostAndUserFromEnv('PORT=1\n')).toEqual({ host: undefined, user: undefined })
  })
})

describe('destinationFor', () => {
  test('-ssh-host and -ssh-user give user@host, and the parameter is not read', () => {
    expect(destinationFor({ sshHost: 'tertium', sshUser: 'deploy', ssmParam: '/env/x/env.dev' }, { resolve, readParameter: noRead }))
      .toBe('deploy@tertium')
  })

  test('-ssh-host alone leaves the user to the ssh config, and the parameter is not read', () => {
    expect(destinationFor({ sshHost: 'drh-mini' }, { resolve: h => `alias-${h}`, readParameter: noRead })).toBe('alias-drh-mini')
  })

  test('with -ssh-host, the parameter is not read and its user is not used for that host', () => {
    expect(destinationFor({ sshHost: 'drh-mini', ssmParam: '/env/x/env.dev' }, { resolve, readParameter: noRead })).toBe('drh-mini')
  })

  test('without -ssh-host, the parameter names the host and the user', () => {
    expect(destinationFor({ ssmParam: '/env/x/env.prod' }, { resolve, readParameter: () => ENV })).toBe('deploy@tertium')
  })

  test('-ssh-user overrides the parameter user; with -ssh-host it is the only user', () => {
    expect(destinationFor({ ssmParam: '/env/x/env.prod', sshUser: 'admin' }, { resolve, readParameter: () => ENV })).toBe('admin@tertium')
    expect(destinationFor({ ssmParam: '/env/x/env.prod', sshHost: 'db1' }, { resolve, readParameter: noRead })).toBe('db1')
  })

  test('needs a host from a flag or the parameter', () => {
    expect(() => destinationFor({}, { resolve, readParameter: () => 'PORT=1\n' })).toThrow('Give -ssh-host')
    expect(() => destinationFor({ ssmParam: '/env/x/env.dev' }, { resolve, readParameter: () => 'PORT=1\n' })).toThrow('Give -ssh-host')
  })

  test('validates the flags', () => {
    expect(() => destinationFor({ sshHost: 'deploy@tertium' }, { resolve })).toThrow('Invalid -ssh-host')
    expect(() => destinationFor({ sshHost: 'bad host' }, { resolve })).toThrow('Invalid -ssh-host')
    expect(() => destinationFor({ sshHost: 'tertium', sshUser: 'de ploy' }, { resolve })).toThrow('Invalid -ssh-user')
    expect(() => destinationFor({ ssmParam: 'env/x' }, { resolve })).toThrow('Invalid -ssm-param')
  })

  test('validateSshDestination accepts user@host and host', () => {
    expect(validateSshDestination('deploy@tertium')).toBe('deploy@tertium')
    expect(validateSshDestination('drh-mini')).toBe('drh-mini')
    expect(() => validateSshDestination('a@b@c')).toThrow('Invalid')
  })
})
