#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// @description Create resized copies of an image, keeping its aspect ratio

const extensions = ['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tif', '.tiff']
const popularWidths = [16, 32, 48, 64, 128, 256, 320, 375, 414, 512, 640, 768, 1024, 1280, 1366, 1440, 1920, 2560, 3840]

const windowsResize = `$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.Drawing; $src = [System.Drawing.Image]::FromFile($env:HLPR_SRC); $scale = [int]$env:HLPR_SIZE / [Math]::Max($src.Width, $src.Height); $width = [Math]::Max(1, [int][Math]::Round($src.Width * $scale)); $height = [Math]::Max(1, [int][Math]::Round($src.Height * $scale)); $bitmap = New-Object System.Drawing.Bitmap $width, $height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $graphics.DrawImage($src, 0, 0, $width, $height); $graphics.Dispose(); $src.Dispose(); $format = switch ([IO.Path]::GetExtension($env:HLPR_DST).ToLower()) { '.jpg' { [System.Drawing.Imaging.ImageFormat]::Jpeg } '.jpeg' { [System.Drawing.Imaging.ImageFormat]::Jpeg } '.bmp' { [System.Drawing.Imaging.ImageFormat]::Bmp } '.gif' { [System.Drawing.Imaging.ImageFormat]::Gif } '.tif' { [System.Drawing.Imaging.ImageFormat]::Tiff } '.tiff' { [System.Drawing.Imaging.ImageFormat]::Tiff } default { [System.Drawing.Imaging.ImageFormat]::Png } }; $bitmap.Save($env:HLPR_DST, $format); $bitmap.Dispose()`

const windowsSize = `$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile($env:HLPR_SRC); "$($img.Width) $($img.Height)"; $img.Dispose()`

export type ResizeArgs = { image: string } & ({ all: true } | { all: false; size: number })

export const parseResizeArgs = (args: string[]): ResizeArgs => {
  let image: string | undefined
  let size: number | undefined
  let all = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-path') image = args[++i]
    else if (args[i] === '-size') size = Number(args[++i])
    else if (args[i] === '--all') all = true
    else throw new Error(`Unknown option: ${args[i]}`)
  }
  if (!image) throw new Error('Required: -path <image> and either -size <px> or --all')
  if (all && size !== undefined) throw new Error('Use either -size <px> or --all, not both')
  if (all) return { image, all }
  if (size === undefined || !Number.isInteger(size) || size <= 0) throw new Error('Required: -path <image> -size <px> (a positive whole number) or --all')
  return { image, all, size }
}

export const resizedPath = (image: string, size: number): string => {
  const { dir, name, ext } = path.parse(image)
  return path.join(dir, `${name}--${size}px${ext}`)
}

const checkImage = (src: string): void => {
  if (!fs.existsSync(src) || !fs.statSync(src).isFile()) throw new Error(`Image not found: ${src}`)
  if (!extensions.includes(path.extname(src).toLowerCase())) throw new Error(`Unsupported image type "${path.extname(src)}". Use one of: ${extensions.join(', ')}`)
}

const linuxMissing = (error: unknown): Error => {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Error('Linux needs ImageMagick (convert, identify). Install it, e.g. apt install imagemagick')
  return error instanceof Error ? error : new Error(String(error))
}

const imageSize = (src: string): number => {
  if (process.platform === 'win32') {
    const [width, height] = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', windowsSize], {
      env: { ...process.env, HLPR_SRC: src },
      encoding: 'utf8',
      windowsHide: true,
    }).trim().split(' ').map(Number)
    return Math.max(width, height)
  }
  if (process.platform === 'darwin') {
    const output = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src], { encoding: 'utf8' })
    return Math.max(...[...output.matchAll(/pixel(?:Width|Height): (\d+)/g)].map(match => Number(match[1])))
  }
  if (process.platform === 'linux') {
    try {
      const [width, height] = execFileSync('identify', ['-format', '%w %h', `${src}[0]`], { encoding: 'utf8' }).trim().split(' ').map(Number)
      return Math.max(width, height)
    } catch (error) {
      throw linuxMissing(error)
    }
  }
  throw new Error(`Unsupported platform: ${process.platform}`)
}

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
  if (fs.existsSync(dst)) throw new Error(`Destination already exists: ${dst}. Move or delete it first.`)
  runResize(src, dst, size)
  return dst
}

export const resizeAll = (image: string): { created: string[]; skipped: string[] } => {
  const src = path.resolve(image)
  checkImage(src)
  const longest = imageSize(src)
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

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr image resize -path <image> (-size <px> | --all)\nCreate <name>--<px>px.<ext> next to the image, with its longest side set to <px>.\n--all creates a copy for each popular width smaller than the image; existing copies are skipped.')
    process.exit(0)
  }
  try {
    const parsed = parseResizeArgs(args)
    if (parsed.all) {
      const { created, skipped } = resizeAll(parsed.image)
      for (const file of created) console.log(`Created ${file}`)
      for (const file of skipped) console.log(`Skipped, already exists: ${file}`)
      if (created.length === 0 && skipped.length === 0) console.log('No popular width is smaller than the image.')
    } else {
      console.log(`Created ${resizeImage(parsed.image, parsed.size)}`)
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}
