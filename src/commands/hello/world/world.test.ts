import { describe, expect, test } from 'bun:test'
import { HELLO_WORLD_ART } from './world.js'

describe('hello world', () => {
  test('contains a complete ASCII-art banner', () => {
    expect(HELLO_WORLD_ART).toHaveLength(5)
    expect(HELLO_WORLD_ART.join('\n')).toContain('___')
  })
})
