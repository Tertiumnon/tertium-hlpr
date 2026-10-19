import { describe, expect, test } from 'bun:test'
import { animations } from './play.js'

describe('animation play', () => {
  test('every animation draws a frame of the requested size', () => {
    for (const { create } of Object.values(animations)) {
      for (let frame = 0; frame < 3; frame++) {
        const lines = create(20, 8)()
        expect(lines).toHaveLength(8)
        for (const line of lines) expect(line.split('\x1b').map((part, index) => index ? part.replace(/^\[[0-9;]*m/, '') : part).join('')).toHaveLength(20)
      }
    }
  })

  test('wave draws tildes on the wave', () => {
    const lines = animations.wave.create(20, 9)()
    expect(lines.join('')).toContain('~')
  })
})
