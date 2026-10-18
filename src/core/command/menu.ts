import readline from 'node:readline'

export const menuWindowSize = 12

export function moveSelection(index: number, direction: 'up' | 'down', count: number): number {
  return (index + (direction === 'up' ? -1 : 1) + count) % count
}

// Shows at most menuWindowSize items around the selection so the menu always fits the terminal.
// Resolves with the chosen index, or undefined when cancelled with Esc or Ctrl+C.
export async function selectFromMenu(items: string[]): Promise<number | undefined> {
  const size = Math.min(items.length, menuWindowSize)
  let selected = 0
  const render = () => {
    const start = Math.min(Math.max(0, selected - Math.floor(size / 2)), items.length - size)
    process.stdout.write(items.slice(start, start + size).map((item, offset) =>
      `${start + offset === selected ? '❯' : ' '} ${item}\x1b[K\n`).join(''))
  }

  console.log('(↑/↓ to move, Enter to select, Esc to cancel)')
  render()
  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  try {
    return await new Promise<number | undefined>((resolve) => {
      const onKeypress = (_input: string, key: { name?: string; ctrl?: boolean }) => {
        if (key.name === 'return' || key.name === 'enter') {
          process.stdin.off('keypress', onKeypress)
          resolve(selected)
        } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
          process.stdin.off('keypress', onKeypress)
          resolve(undefined)
        } else if (key.name === 'up' || key.name === 'down') {
          selected = moveSelection(selected, key.name, items.length)
          process.stdout.write(`\x1b[${size}A`)
          render()
        }
      }
      process.stdin.on('keypress', onKeypress)
    })
  } finally {
    process.stdin.setRawMode(false)
    process.stdin.pause()
    process.stdout.write('\n')
  }
}
