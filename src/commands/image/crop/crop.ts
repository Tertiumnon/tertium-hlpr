#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { type Box, checkFreeDestination, checkImage, imageMagickGravity, imageSize, linuxMissing, parseBox, sizedPath, windowsSave } from '../../../core/image/image.js'

// @description Create a copy of an image cropped to an exact size

const windowsCrop = `$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.Drawing; $src = [System.Drawing.Image]::FromFile($env:HLPR_SRC); $width = [int]$env:HLPR_WIDTH; $height = [int]$env:HLPR_HEIGHT; $scale = [Math]::Max($width / $src.Width, $height / $src.Height); $scaledWidth = [Math]::Max($width, [int][Math]::Round($src.Width * $scale)); $scaledHeight = [Math]::Max($height, [int][Math]::Round($src.Height * $scale)); $x = switch ($env:HLPR_ALIGN) { 'left' { 0 } 'right' { $width - $scaledWidth } default { [int][Math]::Floor(($width - $scaledWidth) / 2) } }; $y = [int][Math]::Floor(($height - $scaledHeight) / 2); $bitmap = New-Object System.Drawing.Bitmap $width, $height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality; $graphics.DrawImage($src, $x, $y, $scaledWidth, $scaledHeight); $graphics.Dispose(); $src.Dispose(); ${windowsSave}`

export type CropArgs = { image: string; box: Box }

export const parseCropArgs = (args: string[]): CropArgs => {
  let image: string | undefined
  let size: string | undefined
  let align: string | undefined
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-path') image = args[++i]
    else if (args[i] === '-size') size = args[++i]
    else if (args[i] === '-align') align = args[++i]
    else throw new Error(`Unknown option: ${args[i]}`)
  }
  const box = image && size ? parseBox(size, align) : undefined
  if (!image || !box) throw new Error('Required: -path <image> -size <width>x<height> (positive whole numbers), e.g. -size 1280x800')
  return { image, box }
}

const runCrop = (src: string, dst: string, { width, height, align }: Box): void => {
  if (process.platform === 'win32') {
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', windowsCrop], {
      env: { ...process.env, HLPR_SRC: src, HLPR_DST: dst, HLPR_WIDTH: String(width), HLPR_HEIGHT: String(height), HLPR_ALIGN: align },
      windowsHide: true,
    })
    return
  }
  if (process.platform === 'darwin') {
    const source = imageSize(src)
    const scale = Math.max(width / source.width, height / source.height)
    const scaledWidth = Math.max(width, Math.round(source.width * scale))
    const scaledHeight = Math.max(height, Math.round(source.height * scale))
    const x = { left: 0, center: Math.floor((scaledWidth - width) / 2), right: scaledWidth - width }[align]
    execFileSync('sips', ['-z', String(scaledHeight), String(scaledWidth), src, '--out', dst])
    execFileSync('sips', ['-c', String(height), String(width), '--cropOffset', String(Math.floor((scaledHeight - height) / 2)), String(x), dst])
    return
  }
  if (process.platform === 'linux') {
    try {
      execFileSync('convert', [src, '-resize', `${width}x${height}^`, '-gravity', imageMagickGravity[align], '-extent', `${width}x${height}`, dst])
    } catch (error) {
      throw linuxMissing(error)
    }
    return
  }
  throw new Error(`Unsupported platform: ${process.platform}`)
}

export const cropImage = (image: string, box: Box): string => {
  const src = path.resolve(image)
  checkImage(src)
  const dst = sizedPath(src, `${box.width}x${box.height}px-crop`)
  checkFreeDestination(dst)
  runCrop(src, dst, box)
  return dst
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr image crop -path <image> -size <width>x<height> [-align left|center|right]\nCreate <name>--<width>x<height>px-crop.<ext> next to the image: it is scaled to cover that size and the rest is cropped.\n-align keeps the left, center (default), or right part; vertical overflow is cropped from the center.')
    process.exit(0)
  }
  try {
    const { image, box } = parseCropArgs(args)
    console.log(`Created ${cropImage(image, box)}`)
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}
