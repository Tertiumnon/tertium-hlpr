import { describe, expect, test } from 'bun:test'
import { readFileSync, writeFileSync } from 'node:fs'
import type { AwsRunner } from '../../../core/aws/param-store.js'
import { editParameter, parseEditArgs } from './edit.js'

// A fake AWS CLI holding one parameter; records every write.
function fakeAws(value: string, type = 'SecureString') {
  const writes: { value: string, type: string }[] = []
  const aws: AwsRunner = args => {
    if (args[1] === 'get-parameter') return JSON.stringify({ Parameter: { Name: '/env/app/env.dev', Type: type, Value: value, Version: 3 } })
    if (args[1] === 'put-parameter') {
      const file = args[args.indexOf('--value') + 1].replace(/^file:\/\//, '')
      writes.push({ value: readFileSync(file, 'utf-8'), type: args[args.indexOf('--type') + 1] })
      return JSON.stringify({ Version: 4 })
    }
    throw new Error(`unexpected ${args.join(' ')}`)
  }
  return { aws, writes }
}

// Replaces the file content the way an editor would.
const editTo = (content: string) => (file: string) => writeFileSync(file, content)

describe('aws-param-store edit', () => {
  test('parses -name and rejects anything else', () => {
    expect(parseEditArgs(['-name', '/env/app/env.dev'])).toEqual({ name: '/env/app/env.dev' })
    expect(() => parseEditArgs(['-name'])).toThrow('Usage: hlpr aws-param-store edit')
    expect(() => parseEditArgs(['/env/app/env.dev'])).toThrow('Usage: hlpr aws-param-store edit')
    expect(() => parseEditArgs(['-name', 'env/app'])).toThrow('Invalid -name')
  })

  test('takes an optional -editor from code, edit, nano or vi, in any order', () => {
    expect(parseEditArgs(['-editor', 'nano', '-name', '/env/app/env.dev'])).toEqual({ name: '/env/app/env.dev', editor: 'nano' })
    expect(parseEditArgs(['-name', '/env/app/env.dev', '-editor', 'code'])).toEqual({ name: '/env/app/env.dev', editor: 'code' })
    expect(() => parseEditArgs(['-name', '/env/app/env.dev', '-editor', 'notepad'])).toThrow('Invalid -editor')
    expect(() => parseEditArgs(['-name', '/env/app/env.dev', '-editor'])).toThrow('Usage: hlpr aws-param-store edit')
  })

  test('writes nothing when the editor leaves the value unchanged', () => {
    const { aws, writes } = fakeAws('A=1\n')
    expect(editParameter('/env/app/env.dev', { aws, edit: () => {} })).toBeUndefined()
    expect(writes).toEqual([])
  })

  test('writes the edited value back with the same type', () => {
    const { aws, writes } = fakeAws('A=1\n')
    expect(editParameter('/env/app/env.dev', { aws, edit: editTo('A=2\n') })).toBe(4)
    expect(writes).toEqual([{ value: 'A=2\n', type: 'SecureString' }])
  })

  test('keeps a plain String parameter a String', () => {
    const { aws, writes } = fakeAws('x', 'String')
    editParameter('/env/app/env.dev', { aws, edit: editTo('y') })
    expect(writes[0].type).toBe('String')
  })

  test('refuses an empty value and writes nothing', () => {
    const { aws, writes } = fakeAws('A=1\n')
    expect(() => editParameter('/env/app/env.dev', { aws, edit: editTo('') })).toThrow('parameters cannot be empty')
    expect(writes).toEqual([])
  })

  test('a failing editor aborts without writing', () => {
    const { aws, writes } = fakeAws('A=1\n')
    expect(() => editParameter('/env/app/env.dev', {
      aws,
      edit: () => { throw new Error('The editor "vi" exited with 1; nothing was changed') },
    })).toThrow('nothing was changed')
    expect(writes).toEqual([])
  })
})
