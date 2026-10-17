import { describe, expect, test } from 'bun:test'
import { parseReadArgs, readRemoteFile } from './read.js'

describe('file read', () => {
  test('runs cat on the remote path through the resolved ssh alias', async () => {
    const calls: string[] = []
    const run = async (sshConfig: string, command: string) => {
      calls.push(`${sshConfig}|${command}`)
      return Buffer.from('hello')
    }
    expect(parseReadArgs(['-host', '10.0.0.5', '-path', '~/app.env'])).toEqual({ host: '10.0.0.5', path: '~/app.env' })
    const content = await readRemoteFile({ path: '~/app.env', sshConfig: 'web' }, run)
    expect(content.toString()).toBe('hello')
    expect(calls).toEqual(["web|cat -- ~/'app.env'"])
  })
})
