import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const extensions = ['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tif', '.tiff']
const aligns = ['left', 'center', 'right'] as const

export type Box = { width: number; height: number; align: (typeof aligns)[number] }

export const imageMagickGravity = { left: 'West', center: 'Center', right: 'East' } as const

// Appended to Windows scripts that draw into $bitmap and dispose $src and $graphics
export const windowsSave = `$format = switch ([IO.Path]::GetExtension($env:HLPR_DST).ToLower()) { '.jpg' { [System.Drawing.Imaging.ImageFormat]::Jpeg } '.jpeg' { [System.Drawing.Imaging.ImageFormat]::Jpeg } '.bmp' { [System.Drawing.Imaging.ImageFormat]::Bmp } '.gif' { [System.Drawing.Imaging.ImageFormat]::Gif } '.tif' { [System.Drawing.Imaging.ImageFormat]::Tiff } '.tiff' { [System.Drawing.Imaging.ImageFormat]::Tiff } default { [System.Drawing.Imaging.ImageFormat]::Png } }; $bitmap.Save($env:HLPR_DST, $format); $bitmap.Dispose()`

const windowsSize = `$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile($env:HLPR_SRC); "$($img.Width) $($img.Height)"; $img.Dispose()`

export const parseBox = (size: string, align: string | undefined): Box | undefined => {
  const match = size.match(/^([1-9]\d*)x([1-9]\d*)$/)
  if (!match) return undefined
  if (align !== undefined && !aligns.includes(align as Box['align'])) throw new Error(`Invalid -align "${align}". Use one of: ${aligns.join(', ')}`)
  return { width: Number(match[1]), height: Number(match[2]), align: (align ?? 'center') as Box['align'] }
}

export const sizedPath = (image: string, suffix: string): string => {
  const { dir, name, ext } = path.parse(image)
  return path.join(dir, `${name}--${suffix}${ext}`)
}

export const checkImage = (src: string): void => {
  if (!fs.existsSync(src) || !fs.statSync(src).isFile()) throw new Error(`Image not found: ${src}`)
  if (!extensions.includes(path.extname(src).toLowerCase())) throw new Error(`Unsupported image type "${path.extname(src)}". Use one of: ${extensions.join(', ')}`)
}

export const checkFreeDestination = (dst: string): void => {
  if (fs.existsSync(dst)) throw new Error(`Destination already exists: ${dst}. Move or delete it first.`)
}

export const linuxMissing = (error: unknown): Error => {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Error('Linux needs ImageMagick (convert, identify). Install it, e.g. apt install imagemagick')
  return error instanceof Error ? error : new Error(String(error))
}

export const imageSize = (src: string): { width: number; height: number } => {
  if (process.platform === 'win32') {
    const [width, height] = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', windowsSize], {
      env: { ...process.env, HLPR_SRC: src },
      encoding: 'utf8',
      windowsHide: true,
    }).trim().split(' ').map(Number)
    return { width, height }
  }
  if (process.platform === 'darwin') {
    const output = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src], { encoding: 'utf8' })
    return { width: Number(output.match(/pixelWidth: (\d+)/)?.[1]), height: Number(output.match(/pixelHeight: (\d+)/)?.[1]) }
  }
  if (process.platform === 'linux') {
    try {
      const [width, height] = execFileSync('identify', ['-format', '%w %h', `${src}[0]`], { encoding: 'utf8' }).trim().split(' ').map(Number)
      return { width, height }
    } catch (error) {
      throw linuxMissing(error)
    }
  }
  throw new Error(`Unsupported platform: ${process.platform}`)
}
