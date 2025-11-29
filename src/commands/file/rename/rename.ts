import fs from 'fs/promises'
import path from 'path'

type Style =
  | 'title_underscore'
  | 'snake'
  | 'kebab'
  | 'camel'
  | 'pascal'
  | 'pascal_underscore'
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
  // handle leading dot files (like .gitignore) - keep leading dot in front of name
  const leadingDot = basename.startsWith('.') ? '.' : ''
  let core = leadingDot ? basename.slice(1) : basename

  // split on the first dot (to preserve multi-extensions like .test.js)
  let ext = ''
  const firstDot = core.indexOf('.')
  if (firstDot !== -1) {
    ext = core.slice(firstDot) // includes the dot and everything after
    core = core.slice(0, firstDot)
  }

  const words = splitWords(core)
  if (words.length === 0) return basename

  switch (style) {
    case 'title_underscore':
      return leadingDot + words.map(cap).join('_') + ext
    case 'snake':
      return leadingDot + words.map((w) => w.toLowerCase()).join('_') + ext
    case 'kebab':
      return leadingDot + words.map((w) => w.toLowerCase()).join('-') + ext
    case 'camel':
      return leadingDot + words.map((w, i) => (i === 0 ? w.toLowerCase() : cap(w))).join('') + ext
    case 'pascal':
      return leadingDot + words.map(cap).join('') + ext
    case 'pascal_underscore':
      return leadingDot + words.map(cap).join('_') + ext
    case 'upper':
      return leadingDot + words.join('_').toUpperCase() + ext
    case 'lower':
      return leadingDot + words.join('_').toLowerCase() + ext
    default:
      return leadingDot + core + ext
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

async function updateFileReferences(
  filePath: string,
  renames: Array<{ from: string; to: string }>
) {
  // Read file content
  const content = await fs.readFile(filePath, 'utf-8')
  let updated = content

  // For each rename, update references in the file
  for (const { from, to } of renames) {
    const fromBasename = path.basename(from)
    const toBasename = path.basename(to)

    // Skip if basenames are the same (case-only or path-only changes)
    if (fromBasename === toBasename) continue

    // Create regex patterns to match various import/require styles
    const fromWithoutExt = fromBasename.replace(/\.[^.]+$/, '')
    const toWithoutExt = toBasename.replace(/\.[^.]+$/, '')

    // Pattern 1: import/export with quotes - match './path/filename' or '../path/filename' or 'filename'
    // Handles: import X from './filename' or require('./filename')
    const importPattern1 = new RegExp(
      `(['"\`])([./]*(?:[^'"\`]*/)?)${escapeRegex(fromWithoutExt)}\\1`,
      'g'
    )
    updated = updated.replace(importPattern1, (_match, quote, pathPart) => {
      return `${quote}${pathPart}${toWithoutExt}${quote}`
    })

    // Pattern 2: import/export with file extension in quotes
    const importPattern2 = new RegExp(
      `(['"\`])([./]*(?:[^'"\`]*/)?)${escapeRegex(fromBasename)}\\1`,
      'g'
    )
    updated = updated.replace(importPattern2, (_match, quote, pathPart) => {
      return `${quote}${pathPart}${toBasename}${quote}`
    })
  }

  // Only write if content changed
  if (updated !== content) {
    await fs.writeFile(filePath, updated, 'utf-8')
    return true
  }
  return false
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function isTextFile(filePath: string): Promise<boolean> {
  try {
    // Read first 512 bytes to check for binary content
    const fd = await fs.open(filePath, 'r')
    const buffer = Buffer.alloc(512)
    const { bytesRead } = await fd.read(buffer, 0, 512, 0)
    await fd.close()

    if (bytesRead === 0) return true // Empty files are text

    // Check for null bytes (common in binary files)
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return false
    }

    // Check for common text file patterns and high ratio of printable ASCII
    let printableCount = 0
    for (let i = 0; i < bytesRead; i++) {
      const byte = buffer[i]
      // Count printable ASCII, tabs, newlines, carriage returns
      if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
        printableCount++
      }
    }

    // If more than 85% of bytes are printable, consider it text
    return printableCount / bytesRead > 0.85
  } catch {
    return false
  }
}

export async function renameRecursive(
  root: string,
  style: Style = 'title_underscore',
  options: { dryRun?: boolean; updateContent?: boolean } = {}
) {
  const performed: Array<{ from: string; to: string }> = []
  const updateContentEnabled = options.updateContent ?? true // Default to true

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

  // Update file contents with new references (only if not dry run and updateContent is enabled)
  if (!options.dryRun && updateContentEnabled && performed.length > 0) {
    // Get all files that might contain references
    const filesToUpdate: string[] = []

    async function collectFiles(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const e of entries) {
        const full = path.join(dir, e.name)
        if (e.isFile()) {
          // Try to update all files - isTextFile will filter out binary files
          filesToUpdate.push(full)
        } else if (e.isDirectory()) {
          await collectFiles(full)
        }
      }
    }

    await collectFiles(root)

    // Update each file with the rename mappings
    for (const file of filesToUpdate) {
      try {
        // Check if file is text-based before attempting to update
        if (await isTextFile(file)) {
          await updateFileReferences(file, performed)
        }
      } catch (err) {
        // Ignore files that can't be read/written (e.g., permission issues)
      }
    }
  }

  return performed
}

// CLI entry point
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  const rootArg = args[0]
  const styleArg = args[1] as Style | undefined

  // If user asked for help, print usage and exit with success
  if (args.includes('--help') || args.includes('-h') || args.includes('/help') || args.includes('/h') || args.includes('/?')) {
    console.log('Usage: rename <root> <style> [--dry|-n] [--no-update-content]')
    console.log('Styles: title_underscore, pascal_underscore, snake, kebab, camel, pascal, upper, lower')
    console.log('Options:')
    console.log('  --dry, -n              Preview changes without applying them')
    console.log('  --no-update-content    Skip updating import/require statements in files')
    process.exit(0)
  }
  const dryRun = args.includes('--dry') || args.includes('-n')
  const updateContent = !args.includes('--no-update-content')

  if (!rootArg || !styleArg) {
    console.error('Usage: rename <root> <style> [--dry|-n] [--no-update-content]')
    console.error('Styles: title_underscore, pascal_underscore, snake, kebab, camel, pascal, upper, lower')
    process.exit(1)
  }

  renameRecursive(rootArg, styleArg, { dryRun, updateContent })
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
