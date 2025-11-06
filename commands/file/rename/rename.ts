import fs from 'fs/promises'
import path from 'path'

type Style =
  | 'title_underscore'
  | 'snake'
  | 'kebab'
  | 'camel'
  | 'pascal'
  | 'upper'
  | 'lower'

function splitWords(s: string): string[] {
  // split on any run of non-letter/number, and also split CamelCase boundaries
  const parts = s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .map((p) => p.trim())
    .filter(Boolean)
  return parts
}

export function transformBasename(basename: string, style: Style): string {
  if (!basename) return basename
  // If string contains an extension (e.g. "file-name.md"), don't try to
  // transform it here — callers (renameRecursive) operate on the core name
  // (without ext). Treat leading-dot files (like ".gitignore") specially
  // and allow them through.
  if (basename.includes('.') && !basename.startsWith('.')) return basename
  // handle leading dot files (like .gitignore) - keep leading dot in front of name
  const leadingDot = basename.startsWith('.') ? '.' : ''
  const core = leadingDot ? basename.slice(1) : basename

  const words = splitWords(core)
  if (words.length === 0) return basename

  switch (style) {
    case 'title_underscore':
      return leadingDot + words.map(cap).join('_')
    case 'snake':
      return leadingDot + words.map((w) => w.toLowerCase()).join('_')
    case 'kebab':
      return leadingDot + words.map((w) => w.toLowerCase()).join('-')
    case 'camel':
      return leadingDot + words.map((w, i) => (i === 0 ? w.toLowerCase() : cap(w))).join('')
    case 'pascal':
      return leadingDot + words.map(cap).join('')
    case 'upper':
      return leadingDot + words.join('_').toUpperCase()
    case 'lower':
      return leadingDot + words.join('_').toLowerCase()
    default:
      return basename
  }
}

function cap(s: string) {
  if (!s) return s
  return s[0].toUpperCase() + s.slice(1).toLowerCase()
}

async function exists(p: string) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function uniqueDestination(dest: string) {
  if (!(await exists(dest))) return dest
  const dir = path.dirname(dest)
  const parsed = path.parse(dest)
  let i = 1
  while (true) {
    const candidate = path.join(dir, `${parsed.name}_${i}${parsed.ext}`)
    if (!(await exists(candidate))) return candidate
    i++
  }
}

async function safeRename(oldPath: string, newPath: string) {
  // If only case differs on a case-insensitive FS, do a temp rename
  const oldLower = oldPath.toLowerCase()
  const newLower = newPath.toLowerCase()
  if (oldLower === newLower && oldPath !== newPath) {
    const tmp = newPath + '__tmp_renaming__'
    await fs.rename(oldPath, tmp)
    try {
      await fs.rename(tmp, newPath)
    } catch (err) {
      // try to revert
      await fs.rename(tmp, oldPath).catch(() => {})
      throw err
    }
  } else {
    // If target exists, find unique destination
    const final = await uniqueDestination(newPath)
    if (final !== newPath) {
      // if we had to modify name to avoid conflict, just rename to unique
      await fs.rename(oldPath, final)
    } else {
      await fs.rename(oldPath, newPath)
    }
  }
}

export async function renameRecursive(
  root: string,
  style: Style = 'title_underscore',
  options: { dryRun?: boolean } = {}
) {
  const performed: Array<{ from: string; to: string }> = []

  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true })

    // First process files
    for (const e of entries) {
      const full = path.join(current, e.name)
      if (e.isFile()) {
        const parsed = path.parse(e.name)
        const newBase = transformBasename(parsed.name, style) + parsed.ext
        if (newBase !== e.name) {
          const dest = path.join(current, newBase)
          if (options.dryRun) {
            performed.push({ from: full, to: dest })
          } else {
            await safeRename(full, dest)
            performed.push({ from: full, to: dest })
          }
        }
      }
    }

    // Re-read entries to get directories after file renames
    const entries2 = await fs.readdir(current, { withFileTypes: true })
    // Then process directories (recurse first so children renamed before parent)
    for (const e of entries2) {
      const full = path.join(current, e.name)
      if (e.isDirectory()) {
        await walk(full)
        const newBase = transformBasename(e.name, style)
        if (newBase !== e.name) {
          const dest = path.join(current, newBase)
          if (options.dryRun) {
            performed.push({ from: full, to: dest })
          } else {
            await safeRename(full, dest)
            performed.push({ from: full, to: dest })
          }
        }
      }
    }
  }

  await walk(root)
  return performed
}

// CLI entry point
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  const rootArg = args[0]
  const styleArg = args[1] as Style | undefined
  const dryRun = args.includes('--dry') || args.includes('-n')

  if (!rootArg || !styleArg) {
    console.error('Usage: rename <root> <style> [--dry|-n]')
    console.error('Styles: title_underscore, snake, kebab, camel, pascal, upper, lower')
    process.exit(1)
  }

  renameRecursive(rootArg, styleArg, { dryRun })
    .then((performed) => {
      if (dryRun) {
        console.log(`Dry run - would rename ${performed.length} items:`)
      } else {
        console.log(`Renamed ${performed.length} items:`)
      }
      performed.forEach(({ from, to }) => {
        console.log(`  ${from} → ${to}`)
      })
    })
    .catch((err) => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export default {
  transformBasename,
  renameRecursive,
}
