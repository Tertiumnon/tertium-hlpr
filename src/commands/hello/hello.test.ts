import { describe, expect, test } from 'bun:test'
import { renderMatrixFrame } from './hello.js'

describe('hello', () => {
  test('renders active drops at their terminal coordinates', () => {
    expect(renderMatrixFrame([-1, 0], 20, () => 0)).toBe('\x1b[1;92m\x1b[1;3H0')
  })
})
