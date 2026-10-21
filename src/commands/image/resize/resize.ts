#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { type Box, checkFreeDestination, checkImage, imageMagickGravity, imageSize, linuxMissing, parseBox, sizedPath, windowsSave } from '../../../core/image/image.js'

// @description Create resized copies of an image

const popularWidths = [16, 32, 48, 64, 128, 256, 320, 375, 414, 512, 640, 768, 1024, 1280, 1366, 1440, 1920, 2560, 3840]
const iconSizes = [16, 32, 48, 64, 128, 256]

const windowsResize = `$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.Drawing; $src = [System.Drawing.Image]::FromFile($env:HLPR_SRC); $scale = [int]$env:HLPR_SIZE / [Math]::Max($src.Width, $src.Height); $width = [Math]::Max(1, [int][Math]::Round($src.Width * $scale)); $height = [Math]::Max(1, [int][Math]::Round($src.Height * $scale)); $bitmap = New-Object System.Drawing.Bitmap $width, $height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $graphics.DrawImage($src, 0, 0, $width, $height); $graphics.Dispose(); $src.Dispose(); ${windowsSave}`

const windowsFit = `$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.Drawing; $src = [System.Drawing.Image]::FromFile($env:HLPR_SRC); $width = [int]$env:HLPR_WIDTH; $height = [int]$env:HLPR_HEIGHT; $scale = [Math]::Min($width / $src.Width, $height / $src.Height); $scaledWidth = [Math]::Min($width, [Math]::Max(1, [int][Math]::Round($src.Width * $scale))); $scaledHeight = [Math]::Min($height, [Math]::Max(1, [int][Math]::Round($src.Height * $scale))); $x = switch ($env:HLPR_ALIGN) { 'left' { 0 } 'right' { $width - $scaledWidth } default { [int][Math]::Floor(($width - $scaledWidth) / 2) } }; $y = [int][Math]::Floor(($height - $scaledHeight) / 2); $bitmap = New-Object System.Drawing.Bitmap $width, $height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.Clear([System.Drawing.Color]::Black); $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality; $graphics.DrawImage($src, $x, $y, $scaledWidth, $scaledHeight); $graphics.Dispose(); $src.Dispose(); ${windowsSave}`

export type ResizeArgs = { image: string; all: boolean; favicon: boolean; size?: number; box?: Box }

export const parseResizeArgs = (args: string[]): ResizeArgs => {
  let image: string | undefined
  let size: string | undefined
  let align: string | undefined
  let all = false
  let favicon = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-path') image = args[++i]
    else if (args[i] === '-size') size = args[++i]
    else if (args[i] === '-align') align = args[++i]
    else if (args[i] === '--all') all = true
    else if (args[i] === '--favicon') favicon = true
    else throw new Error(`Unknown option: ${args[i]}`)
  }
  if (!image) throw new Error('Required: -path <image> and one of -size <px>, --all, or --favicon')
  if ([size !== undefined, all, favicon].filter(Boolean).length > 1) throw new Error('Use only one of -size <px>, --all, or --favicon')
  const box = size === undefined ? undefined : parseBox(size, align)
  if (align !== undefined && !box) throw new Error('-align needs -size <width>x<height>, e.g. -size 1280x800 -align left')
  if (all || favicon) return { image, all, favicon }
  if (box) return { image, all, favicon, box }
  if (size === undefined || !/^[1-9]\d*$/.test(size)) throw new Error('Required: -path <image> -size <px> or <width>x<height> (positive whole numbers), --all, or --favicon')
  return { image, all, favicon, size: Number(size) }
}

export const resizedPath = (image: string, size: number | string): string => sizedPath(image, `${size}px`)

const runResize = (src: string, dst: string, size: number): void => {
  if (process.platform === 'win32') {
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', windowsResize], {
      env: { ...process.env, HLPR_SRC: src, HLPR_DST: dst, HLPR_SIZE: String(size) },
      windowsHide: true,
    })
    return
  }
  if (process.platform === 'darwin') {
    execFileSync('sips', ['-Z', String(size), src, '--out', dst])
    return
  }
  if (process.platform === 'linux') {
    try {
      execFileSync('convert', [src, '-resize', `${size}x${size}`, dst])
    } catch (error) {
      throw linuxMissing(error)
    }
    return
  }
  throw new Error(`Unsupported platform: ${process.platform}`)
}

export const resizeImage = (image: string, size: number): string => {
  const src = path.resolve(image)
  checkImage(src)
  const dst = resizedPath(src, size)
  checkFreeDestination(dst)
  runResize(src, dst, size)
  return dst
}

const runFit = (src: string, dst: string, { width, height, align }: Box): void => {
  if (process.platform === 'win32') {
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', windowsFit], {
      env: { ...process.env, HLPR_SRC: src, HLPR_DST: dst, HLPR_WIDTH: String(width), HLPR_HEIGHT: String(height), HLPR_ALIGN: align },
      windowsHide: true,
    })
    return
  }
  if (process.platform === 'darwin') {
    const source = imageSize(src)
    const scale = Math.min(width / source.width, height / source.height)
    const scaledWidth = Math.min(width, Math.max(1, Math.round(source.width * scale)))
    const scaledHeight = Math.min(height, Math.max(1, Math.round(source.height * scale)))
    execFileSync('sips', ['-z', String(scaledHeight), String(scaledWidth), src, '--out', dst])
    // sips only pads centered, so left/right pad a wider canvas and crop the unwanted bar off one side
    const paddedWidth = align === 'center' ? width : 2 * width - scaledWidth
    execFileSync('sips', ['-p', String(height), String(paddedWidth), '--padColor', '000000', dst])
    if (align !== 'center') execFileSync('sips', ['-c', String(height), String(width), '--cropOffset', '0', String(align === 'left' ? width - scaledWidth : 0), dst])
    return
  }
  if (process.platform === 'linux') {
    try {
      execFileSync('convert', [src, '-resize', `${width}x${height}`, '-background', 'black', '-gravity', imageMagickGravity[align], '-extent', `${width}x${height}`, dst])
    } catch (error) {
      throw linuxMissing(error)
    }
    return
  }
  throw new Error(`Unsupported platform: ${process.platform}`)
}

export const fitImage = (image: string, box: Box): string => {
  const src = path.resolve(image)
  checkImage(src)
  const dst = resizedPath(src, `${box.width}x${box.height}`)
  checkFreeDestination(dst)
  runFit(src, dst, box)
  return dst
}

export const resizeAll = (image: string): { created: string[]; skipped: string[] } => {
  const src = path.resolve(image)
  checkImage(src)
  const { width, height } = imageSize(src)
  const longest = Math.max(width, height)
  const created: string[] = []
  const skipped: string[] = []
  for (const width of popularWidths.filter(width => width < longest)) {
    const dst = resizedPath(src, width)
    if (fs.existsSync(dst)) {
      skipped.push(dst)
      continue
    }
    runResize(src, dst, width)
    created.push(dst)
  }
  return { created, skipped }
}

// ICO header (6 bytes), one 16-byte directory entry per size, then the PNG data of each size
const iconFile = (pngs: { size: number; data: Buffer }[]): Buffer => {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  const directory = Buffer.alloc(16 * pngs.length)
  let offset = header.length + directory.length
  pngs.forEach(({ size, data }, i) => {
    const at = 16 * i
    const dimension = size === 256 ? 0 : size
    directory.writeUInt8(dimension, at)
    directory.writeUInt8(dimension, at + 1)
    directory.writeUInt16LE(1, at + 4)
    directory.writeUInt16LE(32, at + 6)
    directory.writeUInt32LE(data.length, at + 8)
    directory.writeUInt32LE(offset, at + 12)
    offset += data.length
  })
  return Buffer.concat([header, directory, ...pngs.map(({ data }) => data)])
}

export const resizeFavicon = (image: string): string => {
  const src = path.resolve(image)
  checkImage(src)
  const { width, height } = imageSize(src)
  const sizes = iconSizes.filter(size => size < Math.max(width, height))
  if (sizes.length === 0) throw new Error(`Image is too small for a favicon. Use an image larger than ${iconSizes[0]} px.`)
  const dst = path.join(path.dirname(src), 'favicon.ico')
  checkFreeDestination(dst)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-favicon-'))
  try {
    const pngs = sizes.map(size => {
      const png = path.join(tmp, `${size}.png`)
      runResize(src, png, size)
      return { size, data: fs.readFileSync(png) }
    })
    fs.writeFileSync(dst, iconFile(pngs))
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  return dst
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr image resize -path <image> (-size <px> | -size <width>x<height> [-align left|center|right] | --all | --favicon)\nCreate <name>--<px>px.<ext> next to the image, with its longest side set to <px>.\n-size <width>x<height> creates <name>--<width>x<height>px.<ext>: the image is scaled to fit inside and the empty space is filled with black; -align places it left, center (default), or right. To crop instead, use hlpr image crop.\n--all creates a copy for each popular width smaller than the image; existing copies are skipped.\n--favicon creates one favicon.ico with 16, 32, 48, 64, 128, and 256 px icons.')
    process.exit(0)
  }
  try {
    const parsed = parseResizeArgs(args)
    if (parsed.box) {
      console.log(`Created ${fitImage(parsed.image, parsed.box)}`)
    } else if (parsed.size !== undefined) {
      console.log(`Created ${resizeImage(parsed.image, parsed.size)}`)
    } else if (parsed.favicon) {
      console.log(`Created ${resizeFavicon(parsed.image)}`)
    } else {
      const { created, skipped } = resizeAll(parsed.image)
      for (const file of created) console.log(`Created ${file}`)
      for (const file of skipped) console.log(`Skipped, already exists: ${file}`)
      if (created.length === 0 && skipped.length === 0) console.log('No popular width is smaller than the image.')
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}
