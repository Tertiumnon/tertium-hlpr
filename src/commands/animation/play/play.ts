#!/usr/bin/env node

// @description Play a terminal animation: wave, stars, fire, pipes, or matrix

import { animateUntilQuit } from '../../../core/terminal.js'
import { wakeUpNeo } from '../../../core/matrix.js'

type Frame = () => string[]
type Animation = { color: string; create: (width: number, height: number) => Frame }

const blank = (width: number, height: number) => Array.from({ length: height }, () => Array<string>(width).fill(' '))

export const animations: Record<string, Animation> = {
  wave: {
    color: '36',
    create: (width, height) => {
      let time = 0
      return () => {
        const lines = blank(width, height)
        time++
        for (let x = 0; x < width; x++) {
          const y = Math.round(height / 2 + Math.sin(x * 0.2 + time * 0.15) * (height / 3))
          if (y >= 0 && y < height) lines[y][x] = '~'
        }
        return lines.map(line => line.join(''))
      }
    },
  },
  stars: {
    color: '97',
    create: (width, height) => {
      const random = () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() + 0.01 })
      const stars = Array.from({ length: 150 }, random)
      return () => {
        const lines = blank(width, height)
        for (const star of stars) {
          star.z -= 0.02
          if (star.z <= 0.01) Object.assign(star, random(), { z: 1 })
          const x = Math.floor((star.x / star.z) * (width / 2) + width / 2)
          const y = Math.floor((star.y / star.z) * (height / 2) + height / 2)
          if (x >= 0 && x < width && y >= 0 && y < height) lines[y][x] = star.z < 0.3 ? '*' : '.'
        }
        return lines.map(line => line.join(''))
      }
    },
  },
  fire: {
    color: '31',
    create: (width, height) => {
      const palette = ' .:-=+*#%@'
      const heat = Array<number>(width * height).fill(0)
      return () => {
        for (let x = 0; x < width; x++) heat[(height - 1) * width + x] = Math.random() < 0.6 ? 9 : 0
        // Each cell takes the average of the three cells below it, cooling as it rises.
        for (let y = 0; y < height - 1; y++) {
          for (let x = 0; x < width; x++) {
            const below = (y + 1) * width
            const sum = heat[below + Math.max(0, x - 1)] + heat[below + x] + heat[below + Math.min(width - 1, x + 1)]
            heat[y * width + x] = Math.max(0, Math.floor(sum / 3 - Math.random() * 1.5))
          }
        }
        return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => palette[heat[y * width + x]]).join(''))
      }
    },
  },
  // Windows 98 "Pipes" screensaver, drawn flat: colored pipes grow and turn, then the screen clears.
  pipes: {
    color: '0',
    create: (width, height) => {
      const colors = ['31', '32', '33', '34', '35', '36', '91', '92', '93', '94', '95', '96']
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      const inside = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height
      const random = () => ({ x: Math.floor(Math.random() * width), y: Math.floor(Math.random() * height), dx: 1, dy: 0, color: colors[Math.floor(Math.random() * colors.length)] })
      const pipes = Array.from({ length: 4 }, random)
      let grid = blank(width, height)
      let frames = 0
      return () => {
        if (++frames % 200 === 0) grid = blank(width, height)
        for (const pipe of pipes) {
          const next = dirs.filter(([dx, dy]) => inside(pipe.x + dx, pipe.y + dy) && !(dx === -pipe.dx && dy === -pipe.dy))
          if (Math.random() < 0.15 || !inside(pipe.x + pipe.dx, pipe.y + pipe.dy)) {
            const [dx, dy] = next[Math.floor(Math.random() * next.length)] ?? [-pipe.dx, -pipe.dy]
            pipe.dx = dx
            pipe.dy = dy
          }
          pipe.x += pipe.dx
          pipe.y += pipe.dy
          if (!inside(pipe.x, pipe.y)) Object.assign(pipe, random())
          else grid[pipe.y][pipe.x] = `\x1b[${pipe.color}m█`
        }
        return grid.map(line => line.join(''))
      }
    },
  },
}

async function main(): Promise<void> {
  const names = ['matrix', ...Object.keys(animations)]
  const requested = process.argv[2]
  if (!requested || requested === '--help' || requested === '-h') {
    console.log('Usage: hlpr animation play <wave|stars|fire|pipes|matrix|random>\nPress q or Esc to stop.')
    return
  }
  const name = requested === 'random' ? names[Math.floor(Math.random() * names.length)] : requested
  if (name === 'matrix') return wakeUpNeo()
  const animation = animations[name]
  if (!animation) throw new Error(`Unknown animation "${name}". Choose one of: ${names.join(', ')}`)

  // Leave the last row free so the frame never scrolls the terminal.
  const width = Math.max(10, (process.stdout.columns || 80) - 1)
  const height = Math.max(5, (process.stdout.rows || 24) - 1)
  const frame = animation.create(width, height)

  process.stdout.write('\x1b[2J')
  await animateUntilQuit(() => {
    process.stdout.write(`\x1b[H\x1b[${animation.color}m${frame().join('\n')}\x1b[0m`)
  }, 50)
  process.stdout.write('\x1b[0m\x1b[2J\x1b[H')
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  })
}
