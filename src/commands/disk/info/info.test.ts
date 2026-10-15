import { expect, test } from 'bun:test'
import { formatDisks, parseDf } from './info.js'

test('parses df output with spaced mounts and reserved capacity', () => {
  const disks = parseDf(`Filesystem 1024-blocks Used Available Capacity Mounted on
/dev/sda1 1000 500 450 53% /
/dev/disk2s1 2000 1000 1000 50% /Volumes/My Disk
tmpfs 0 0 0 0% /empty
`)
  expect(disks).toEqual([
    { name: '/dev/sda1', mount: '/', total: 1024000, used: 512000, free: 460800 },
    { name: '/dev/disk2s1', mount: '/Volumes/My Disk', total: 2048000, used: 1024000, free: 1024000 },
  ])
  expect(() => parseDf('header\ninvalid')).toThrow('Unrecognized df output')
    expect(formatDisks(disks, false)).toContain('[##########----------] 50.0% used')
    expect(formatDisks(disks, false)).toContain('Available | 450.0 KiB\n\n/Volumes/My Disk')
})

test('handles empty and full volumes', () => {
  expect(formatDisks([], false)).toBe('No mounted volumes found.')
  expect(formatDisks([{ name: 'Full', mount: 'C:', total: 1024, used: 1024, free: 0 }], false)).toContain('[####################] 100.0% used')
})
