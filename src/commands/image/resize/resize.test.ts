import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseResizeArgs, resizedPath, resizeAll, resizeFavicon, resizeImage } from './resize.js'

// 1x1 transparent PNG
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

describe('parseResizeArgs', () => {
  test('reads the image from -path and the size in any order', () => {
    expect(parseResizeArgs(['-size', '256', '-path', 'photo.png'])).toEqual({ image: 'photo.png', all: false, favicon: false, size: 256 })
  })

  test('reads --all and --favicon in any position', () => {
    expect(parseResizeArgs(['--all', '-path', 'photo.png'])).toEqual({ image: 'photo.png', all: true, favicon: false })
    expect(parseResizeArgs(['-path', 'photo.png', '--favicon'])).toEqual({ image: 'photo.png', all: false, favicon: true })
  })

  test('rejects a missing image, a missing size, or a size that is not a positive whole number', () => {
    expect(() => parseResizeArgs(['-size', '256'])).toThrow('Required')
    expect(() => parseResizeArgs(['-path', 'photo.png'])).toThrow('Required')
    expect(() => parseResizeArgs(['-path', 'photo.png', '-size', '0'])).toThrow('Required')
    expect(() => parseResizeArgs(['-path', 'photo.png', '-size', '12.5'])).toThrow('Required')
  })

  test('rejects a bare positional image', () => {
    expect(() => parseResizeArgs(['photo.png', '-size', '256'])).toThrow('Unknown option: photo.png')
  })

  test('rejects combining -size, --all, and --favicon', () => {
    expect(() => parseResizeArgs(['-path', 'photo.png', '-size', '256', '--all'])).toThrow('Use only one')
    expect(() => parseResizeArgs(['-path', 'photo.png', '--all', '--favicon'])).toThrow('Use only one')
    expect(() => parseResizeArgs(['-path', 'photo.png', '-size', '256', '--favicon'])).toThrow('Use only one')
  })
})

describe('resizeAll', () => {
  test('creates a copy for each popular width below the image size and skips existing copies', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-resize-'))
    try {
      const dot = path.join(tmp, 'dot.png')
      fs.writeFileSync(dot, png)
      const square = resizeImage(dot, 800)
      const existing = path.join(tmp, 'dot--800px--256px.png')
      fs.writeFileSync(existing, 'keep me')
      const { created, skipped } = resizeAll(square)
      expect(created.map(file => path.basename(file))).toEqual(
        ['16', '32', '48', '64', '128', '320', '375', '414', '512', '640', '768'].map(size => `dot--800px--${size}px.png`),
      )
      expect(skipped).toEqual([existing])
      expect(fs.readFileSync(existing, 'utf8')).toBe('keep me')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  }, 30_000)

  test('creates nothing when no popular width is smaller than the image', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-resize-'))
    try {
      const src = path.join(tmp, 'dot.png')
      fs.writeFileSync(src, png)
      expect(resizeAll(src)).toEqual({ created: [], skipped: [] })
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe('resizeFavicon', () => {
  test('writes favicon.ico that holds every favicon size below the image size', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-resize-'))
    try {
      const dot = path.join(tmp, 'dot.png')
      fs.writeFileSync(dot, png)
      const square = resizeImage(dot, 800)
      const ico = resizeFavicon(square)
      expect(path.basename(ico)).toBe('favicon.ico')
      const data = fs.readFileSync(ico)
      expect(data.readUInt16LE(2)).toBe(1)
      expect(data.readUInt16LE(4)).toBe(6)
      expect([...Array(6)].map((_, i) => data[6 + 16 * i] || 256)).toEqual([16, 32, 48, 64, 128, 256])
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  }, 60_000)

  test('rejects an image too small for any favicon size', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-resize-'))
    try {
      const src = path.join(tmp, 'dot.png')
      fs.writeFileSync(src, png)
      expect(() => resizeFavicon(src)).toThrow('too small')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe('resizedPath', () => {
  test('appends --<size>px before the extension', () => {
    expect(resizedPath(path.join('pics', 'cat.jpg'), 256)).toBe(path.join('pics', 'cat--256px.jpg'))
  })
})

describe('resizeImage', () => {
  test('writes a copy named <name>--<size>px.<ext> at the requested size', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-resize-'))
    try {
      const src = path.join(tmp, 'icon.png')
      fs.writeFileSync(src, png)
      const dst = resizeImage(src, 256)
      expect(dst).toBe(path.join(tmp, 'icon--256px.png'))
      const output = fs.readFileSync(dst)
      expect(output.readUInt32BE(16)).toBe(256)
      expect(output.readUInt32BE(20)).toBe(256)
      expect(fs.readFileSync(src)).toEqual(png)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  test('refuses to overwrite an existing copy', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-resize-'))
    try {
      const src = path.join(tmp, 'icon.png')
      fs.writeFileSync(src, png)
      fs.writeFileSync(path.join(tmp, 'icon--256px.png'), 'keep me')
      expect(() => resizeImage(src, 256)).toThrow('Destination already exists')
      expect(fs.readFileSync(path.join(tmp, 'icon--256px.png'), 'utf8')).toBe('keep me')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  test('rejects missing files and unsupported types', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-resize-'))
    try {
      expect(() => resizeImage(path.join(tmp, 'missing.png'), 256)).toThrow('Image not found')
      fs.writeFileSync(path.join(tmp, 'notes.txt'), 'x')
      expect(() => resizeImage(path.join(tmp, 'notes.txt'), 256)).toThrow('Unsupported image type')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
