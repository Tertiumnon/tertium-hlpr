import readline from 'node:readline'

export type Key = { name?: string; ctrl?: boolean }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const isQuitKey = (input: string, key: Key) => input === 'q' || key.name === 'escape' || (key.ctrl === true && key.name === 'c')

// Sends each keypress to onKey in raw mode. Returns a function that restores the terminal.
export function readKeys(onKey: (input: string, key: Key) => void): () => void {
  if (!process.stdin.isTTY) throw new Error('This command needs an interactive terminal')

  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.on('keypress', onKey)
  process.stdin.resume()
  return () => {
    process.stdin.off('keypress', onKey)
    process.stdin.setRawMode(false)
    process.stdin.pause()
  }
}

// Calls draw every interval until q, Esc, or Ctrl+C.
export async function animateUntilQuit(draw: () => void, interval: number): Promise<void> {
  let running = true
  const stop = readKeys((input, key) => {
    if (isQuitKey(input, key)) running = false
  })
  try {
    while (running) {
      draw()
      await sleep(interval)
    }
  } finally {
    stop()
  }
}
