import { describe, expect, test } from 'bun:test'
import { writeFile } from 'node:fs/promises'
import { editRemoteFile, parseEditArgs } from './edit.js'

const options = { path: '/etc/app.conf', sshConfig: 'web' }

function fakeHost(content: string) {
  const writes: string[] = []
  let remote: Buffer = Buffer.from(content)
  const run = async (_sshConfig: string, command: string, input?: Buffer) => {
    if (input) { remote = input; writes.push(command); return Buffer.alloc(0) }
    return remote
  }
  return { run, writes, current: () => remote.toString() }
}

describe('file edit', () => {
  test('uploads only when the editor changed the file', async () => {
    const host = fakeHost('a=1\n')
    const changed = await editRemoteFile(options, host.run, file => writeFile(file, 'a=2\n'))
    expect(changed).toBe(true)
    expect(host.current()).toBe('a=2\n')
    expect(host.writes).toEqual(["cat > '/etc/app.conf'"])
  })

  test('does not upload when nothing changed', async () => {
    const host = fakeHost('a=1\n')
    expect(await editRemoteFile(options, host.run, async () => {})).toBe(false)
    expect(host.writes).toEqual([])
  })
})

describe('file edit args', () => {
  test('takes an optional -editor, validated against code, edit, nano and vi', () => {
    expect(parseEditArgs(['-host', 'web', '-path', '/etc/app.conf', '-editor', 'code'])).toEqual({ host: 'web', path: '/etc/app.conf', editor: 'code' })
    expect(parseEditArgs(['-host', 'web', '-path', '/etc/app.conf'])).toEqual({ host: 'web', path: '/etc/app.conf' })
    expect(() => parseEditArgs(['-host', 'web', '-path', '/a', '-editor', 'notepad'])).toThrow('Invalid -editor')
    expect(() => parseEditArgs(['-host', 'web', '-path', '/a', '-editor'])).toThrow('Usage: hlpr file edit')
  })
})
