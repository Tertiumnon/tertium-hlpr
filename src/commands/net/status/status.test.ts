import { expect, test } from 'bun:test'
import { networkStatus } from './status.js'

test('reports network interfaces as names and addresses', () => {
  const interfaces = networkStatus()
  expect(Array.isArray(interfaces)).toBe(true)
  for (const [name, addresses] of interfaces) {
    expect(name.length).toBeGreaterThan(0)
    expect(addresses.length).toBeGreaterThan(0)
  }
})
