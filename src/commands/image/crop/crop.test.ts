import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { cropImage, parseCropArgs } from './crop.js'

// 1x1 transparent PNG
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

describe('parseCropArgs', () => {
  test('reads the image, the size, and the alignment in any order, centered by default', () => {
    expect(parseCropArgs(['-size', '1280x800', '-path', 'photo.png'])).toEqual({ image: 'photo.png', box: { width: 1280, height: 800, align: 'center' } })
    expect(parseCropArgs(['-align', 'right', '-path', 'photo.png', '-size', '1280x800'])).toEqual({ image: 'photo.png', box: { width: 1280, height: 800, align: 'right' } })
  })

  test('rejects a missing image, a missing or single-number size, or a bad -align', () => {
    expect(() => parseCropArgs(['-size', '1280x800'])).toThrow('Required')
    expect(() => parseCropArgs(['-path', 'photo.png'])).toThrow('Required')
    expect(() => parseCropArgs(['-path', 'photo.png', '-size', '256'])).toThrow('Required')
    expect(() => parseCropArgs(['-path', 'photo.png', '-size', '1280x0'])).toThrow('Required')
    expect(() => parseCropArgs(['-path', 'photo.png', '-size', '1280x800', '-align', 'top'])).toThrow('Invalid -align')
  })
})

describe('cropImage', () => {
  test('writes <name>--<width>x<height>px-crop.<ext> at exactly that size and refuses to overwrite it', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-crop-'))
    try {
      const src = path.join(tmp, 'icon.png')
      fs.writeFileSync(src, png)
      const dst = cropImage(src, { width: 300, height: 100, align: 'left' })
      expect(dst).toBe(path.join(tmp, 'icon--300x100px-crop.png'))
      const output = fs.readFileSync(dst)
      expect(output.readUInt32BE(16)).toBe(300)
      expect(output.readUInt32BE(20)).toBe(100)
      expect(() => cropImage(src, { width: 300, height: 100, align: 'right' })).toThrow('Destination already exists')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  test('rejects missing files and unsupported types', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-crop-'))
    try {
      expect(() => cropImage(path.join(tmp, 'missing.png'), { width: 10, height: 10, align: 'center' })).toThrow('Image not found')
      fs.writeFileSync(path.join(tmp, 'notes.txt'), 'x')
      expect(() => cropImage(path.join(tmp, 'notes.txt'), { width: 10, height: 10, align: 'center' })).toThrow('Unsupported image type')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
