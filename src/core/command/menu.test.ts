import { expect, test } from 'bun:test'
import { moveSelection } from './menu.js'

test('arrow keys wrap around the menu', () => {
  expect(moveSelection(0, 'up', 3)).toBe(2)
  expect(moveSelection(2, 'down', 3)).toBe(0)
  expect(moveSelection(1, 'down', 3)).toBe(2)
})
