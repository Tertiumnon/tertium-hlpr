import { describe, expect, test } from 'bun:test'
import { parseKillTarget } from './kill.js'

describe('process kill', () => {
  test('parses process ID and port targets', () => {
    expect(parseKillTarget(['-id', '123'])).toEqual({ id: 123 })
    expect(parseKillTarget(['-port', '3000'])).toEqual({ port: 3000 })
    expect(() => parseKillTarget(['-id', '1', '-port', '2'])).toThrow()
  })
})
