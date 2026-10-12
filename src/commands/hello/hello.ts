#!/usr/bin/env node

// @description Wake up Neo, then display a Matrix rain effect

const glyphs = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ'
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function renderMatrixFrame(drops: number[], rows: number, random = Math.random): string {
  return drops.map((row, column) => {
    if (row < 0) return ''
    const glyph = glyphs[Math.floor(random() * glyphs.length)]
    const x = column * 2 + 1
    const tail = row > 5 ? `\x1b[2;32m\x1b[${row - 5};${x}H${glyph}` : ''
    return `${tail}\x1b[1;92m\x1b[${(row % rows) + 1};${x}H${glyph}`
  }).join('')
}

async function typeLine(line: string): Promise<void> {
  for (const character of line) {
    process.stdout.write(character)
    await sleep(30)
  }
  process.stdout.write('\n')
  await sleep(250)
}

async function main(): Promise<void> {
  process.stdout.write('\x1b[2J\x1b[H\x1b[32m')
  await typeLine('Wake up, Neo...')
  await typeLine('The Matrix has you...')
  await typeLine('Follow the white rabbit.')
  await typeLine('Knock, knock, Neo.')
  await sleep(500)

  const columns = Math.max(10, Math.floor((process.stdout.columns || 80) / 2))
  const rows = process.stdout.rows || 24
  const drops = Array.from({ length: columns }, () => -Math.floor(Math.random() * rows))
  process.stdout.write('\x1b[2J')

  for (let frame = 0; frame < 60; frame++) {
    process.stdout.write(renderMatrixFrame(drops, rows))
    for (let column = 0; column < drops.length; column++) {
      drops[column]++
      if (drops[column] > rows + 5) drops[column] = -Math.floor(Math.random() * rows)
    }
    await sleep(40)
  }

  process.stdout.write(`\x1b[0m\x1b[${rows};1H\n`)
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  if (process.argv.slice(2).includes('--help') || process.argv.slice(2).includes('-h')) {
    console.log('Usage: hlpr hello')
    process.exit(0)
  }
  main().catch((error) => {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  })
}
