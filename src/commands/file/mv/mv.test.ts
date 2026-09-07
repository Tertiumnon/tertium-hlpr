import { describe, expect, test } from 'bun:test'
import { renameFile } from './mv.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

function mktmp(): string {
  return fs.mkdtempSync(path.join(process.cwd(), 'test-tmp-mv-'))
}

function mktmpOutsideRepo(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-mv-test-'))
}

function cleanup(tmp: string) {
  fs.rmSync(tmp, { recursive: true, force: true })
}

describe('mv module', () => {
  test('renames a file in place', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.md'), '# hi')
      const result = await renameFile(path.join(tmp, 'old-name.md'), 'new-name.md', { root: tmp })

      expect(fs.existsSync(path.join(tmp, 'new-name.md'))).toBe(true)
      expect(fs.existsSync(path.join(tmp, 'old-name.md'))).toBe(false)
      expect(result.to).toBe(path.join(tmp, 'new-name.md'))
    } finally {
      cleanup(tmp)
    }
  })

  test('moves a file into a new nested directory, creating it', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.md'), '# hi')
      await renameFile(path.join(tmp, 'old-name.md'), path.join(tmp, 'sub', 'dir', 'new-name.md'), { root: tmp })

      expect(fs.existsSync(path.join(tmp, 'sub', 'dir', 'new-name.md'))).toBe(true)
      expect(fs.existsSync(path.join(tmp, 'old-name.md'))).toBe(false)
    } finally {
      cleanup(tmp)
    }
  })

  test('updates markdown links pointing at the renamed file', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.md'), '# hi')
      fs.writeFileSync(path.join(tmp, 'index.md'), 'See [the doc](./old-name.md) for details.')

      const result = await renameFile(path.join(tmp, 'old-name.md'), 'new-name.md', { root: tmp })

      const content = fs.readFileSync(path.join(tmp, 'index.md'), 'utf-8')
      expect(content).toBe('See [the doc](./new-name.md) for details.')
      expect(result.updatedFiles).toHaveLength(1)
      expect(result.updatedFiles[0].count).toBe(1)
    } finally {
      cleanup(tmp)
    }
  })

  test('updates markdown links from files in nested directories using correct relative path', async () => {
    const tmp = mktmp()
    try {
      const sub = path.join(tmp, 'sub')
      fs.mkdirSync(sub)
      fs.writeFileSync(path.join(tmp, 'old-name.md'), '# hi')
      fs.writeFileSync(path.join(sub, 'index.md'), 'Link: [doc](../old-name.md)')

      await renameFile(path.join(tmp, 'old-name.md'), 'new-name.md', { root: tmp })

      const content = fs.readFileSync(path.join(sub, 'index.md'), 'utf-8')
      expect(content).toBe('Link: [doc](../new-name.md)')
    } finally {
      cleanup(tmp)
    }
  })

  test('updates markdown links when file moves into a different directory', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.md'), '# hi')
      fs.writeFileSync(path.join(tmp, 'index.md'), 'Link: [doc](./old-name.md)')

      await renameFile(path.join(tmp, 'old-name.md'), path.join(tmp, 'archive', 'new-name.md'), { root: tmp })

      const content = fs.readFileSync(path.join(tmp, 'index.md'), 'utf-8')
      expect(content).toBe('Link: [doc](./archive/new-name.md)')
    } finally {
      cleanup(tmp)
    }
  })

  test('updates wikilinks pointing at multi-dot filenames (e.g. locale-suffixed .ru.md)', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.ru.md'), '# hi')
      fs.writeFileSync(
        path.join(tmp, 'index.md'),
        'See [[old-name.ru]] and [[old-name.ru|Alias]] and [link](./old-name.ru.md).'
      )

      await renameFile(path.join(tmp, 'old-name.ru.md'), 'new-name.ru.md', { root: tmp })

      const content = fs.readFileSync(path.join(tmp, 'index.md'), 'utf-8')
      expect(content).toBe('See [[new-name.ru]] and [[new-name.ru|Alias]] and [link](./new-name.ru.md).')
    } finally {
      cleanup(tmp)
    }
  })

  test('updates wikilinks including alias and heading suffixes', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.md'), '# hi')
      fs.writeFileSync(
        path.join(tmp, 'index.md'),
        'See [[old-name]] and [[old-name|Custom Title]] and [[old-name#Section]].'
      )

      await renameFile(path.join(tmp, 'old-name.md'), 'new-name.md', { root: tmp })

      const content = fs.readFileSync(path.join(tmp, 'index.md'), 'utf-8')
      expect(content).toBe('See [[new-name]] and [[new-name|Custom Title]] and [[new-name#Section]].')
    } finally {
      cleanup(tmp)
    }
  })

  test('does not use bare wikilink matching when basename is ambiguous', async () => {
    const tmp = mktmp()
    try {
      // Put the referencing file in a directory that shares neither the old
      // nor the duplicate file's directory, so only the vault-wide bare
      // basename shortcut could possibly resolve the link.
      const notesDir = path.join(tmp, 'notes')
      const dupDir = path.join(tmp, 'dup')
      const otherDir = path.join(tmp, 'other')
      fs.mkdirSync(notesDir)
      fs.mkdirSync(dupDir)
      fs.mkdirSync(otherDir)
      fs.writeFileSync(path.join(notesDir, 'old-name.md'), '# hi')
      fs.writeFileSync(path.join(dupDir, 'old-name.md'), '# other file, same basename')
      fs.writeFileSync(path.join(otherDir, 'index.md'), 'See [[old-name]].')

      const result = await renameFile(path.join(notesDir, 'old-name.md'), 'new-name.md', { root: tmp })

      // ambiguous basename -> bare wikilink must not be rewritten
      const content = fs.readFileSync(path.join(otherDir, 'index.md'), 'utf-8')
      expect(content).toBe('See [[old-name]].')
      expect(result.bareBasenameAmbiguous).toBe(true)
    } finally {
      cleanup(tmp)
    }
  })

  test('updates quoted import/require paths', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.ts'), 'export const x = 1')
      fs.writeFileSync(path.join(tmp, 'index.ts'), `import { x } from './old-name'\nconst y = require('./old-name')\n`)

      await renameFile(path.join(tmp, 'old-name.ts'), 'new-name.ts', { root: tmp })

      const content = fs.readFileSync(path.join(tmp, 'index.ts'), 'utf-8')
      expect(content).toContain(`'./new-name'`)
      expect(content).not.toContain(`'./old-name'`)
    } finally {
      cleanup(tmp)
    }
  })

  test('dry run makes no changes on disk', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.md'), '# hi')
      fs.writeFileSync(path.join(tmp, 'index.md'), 'See [doc](./old-name.md)')

      const result = await renameFile(path.join(tmp, 'old-name.md'), 'new-name.md', { root: tmp, dryRun: true })

      expect(fs.existsSync(path.join(tmp, 'old-name.md'))).toBe(true)
      expect(fs.existsSync(path.join(tmp, 'new-name.md'))).toBe(false)
      expect(fs.readFileSync(path.join(tmp, 'index.md'), 'utf-8')).toBe('See [doc](./old-name.md)')
      expect(result.updatedFiles).toHaveLength(1)
    } finally {
      cleanup(tmp)
    }
  })

  test('throws when destination exists and --force not set', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.md'), '# hi')
      fs.writeFileSync(path.join(tmp, 'new-name.md'), '# already here')

      await expect(renameFile(path.join(tmp, 'old-name.md'), 'new-name.md', { root: tmp })).rejects.toThrow()
    } finally {
      cleanup(tmp)
    }
  })

  test('overwrites destination when --force is set', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.md'), '# new content')
      fs.writeFileSync(path.join(tmp, 'new-name.md'), '# stale content')

      await renameFile(path.join(tmp, 'old-name.md'), 'new-name.md', { root: tmp, force: true })

      expect(fs.readFileSync(path.join(tmp, 'new-name.md'), 'utf-8')).toBe('# new content')
    } finally {
      cleanup(tmp)
    }
  })

  test('skips binary files when scanning for references', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.md'), '# hi')
      const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      fs.writeFileSync(path.join(tmp, 'image.png'), binaryData)

      await renameFile(path.join(tmp, 'old-name.md'), 'new-name.md', { root: tmp })

      expect(fs.readFileSync(path.join(tmp, 'image.png'))).toEqual(binaryData)
    } finally {
      cleanup(tmp)
    }
  })

  test('works across a wide variety of file extensions', async () => {
    const extensions = ['md', 'markdown', 'js', 'ts', 'tsx', 'jsx', 'py', 'go', 'rs', 'json', 'yaml', 'yml', 'css', 'html', 'txt', 'sh']

    for (const ext of extensions) {
      const tmp = mktmp()
      try {
        fs.writeFileSync(path.join(tmp, `old-name.${ext}`), 'content')
        fs.writeFileSync(path.join(tmp, 'referrer.txt'), `see './old-name.${ext}'`)

        const result = await renameFile(path.join(tmp, `old-name.${ext}`), `new-name.${ext}`, { root: tmp })

        expect(fs.existsSync(path.join(tmp, `new-name.${ext}`))).toBe(true)
        expect(fs.existsSync(path.join(tmp, `old-name.${ext}`))).toBe(false)
        expect(fs.readFileSync(path.join(tmp, 'referrer.txt'), 'utf-8')).toBe(`see './new-name.${ext}'`)
        expect(result.updatedFiles).toHaveLength(1)
      } finally {
        cleanup(tmp)
      }
    }
  })

  test('works for dotfiles and files with no extension', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-env'), 'SECRET=1')
      fs.writeFileSync(path.join(tmp, 'referrer.md'), "load './old-env' at startup")

      await renameFile(path.join(tmp, 'old-env'), 'new-env', { root: tmp })

      expect(fs.existsSync(path.join(tmp, 'new-env'))).toBe(true)
      expect(fs.readFileSync(path.join(tmp, 'referrer.md'), 'utf-8')).toBe("load './new-env' at startup")
    } finally {
      cleanup(tmp)
    }
  })

  test('renaming a file also changes its extension and rewrites bare-import references correctly', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.js'), 'export const x = 1')
      fs.writeFileSync(path.join(tmp, 'index.js'), `import { x } from './old-name'\n`)

      await renameFile(path.join(tmp, 'old-name.js'), 'new-name.ts', { root: tmp })

      expect(fs.existsSync(path.join(tmp, 'new-name.ts'))).toBe(true)
      expect(fs.readFileSync(path.join(tmp, 'index.js'), 'utf-8')).toBe(`import { x } from './new-name'\n`)
    } finally {
      cleanup(tmp)
    }
  })

  test('updates markdown links to a file across mismatched referrer extensions', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.py'), 'print(1)')
      fs.writeFileSync(path.join(tmp, 'readme.rst'), 'See [script](./old-name.py) for details.')

      await renameFile(path.join(tmp, 'old-name.py'), 'new-name.py', { root: tmp })

      expect(fs.readFileSync(path.join(tmp, 'readme.rst'), 'utf-8')).toBe('See [script](./new-name.py) for details.')
    } finally {
      cleanup(tmp)
    }
  })

  test('does not update references when updateContent is false', async () => {
    const tmp = mktmp()
    try {
      fs.writeFileSync(path.join(tmp, 'old-name.md'), '# hi')
      fs.writeFileSync(path.join(tmp, 'index.md'), 'See [doc](./old-name.md)')

      await renameFile(path.join(tmp, 'old-name.md'), 'new-name.md', { root: tmp, updateContent: false })

      expect(fs.readFileSync(path.join(tmp, 'index.md'), 'utf-8')).toBe('See [doc](./old-name.md)')
    } finally {
      cleanup(tmp)
    }
  })

  test('without --root, walks up to the nearest git repo root instead of using cwd', async () => {
    // Simulate a repo: tmp/.git at the top, file + referrer several levels deep,
    // and confirm scanning finds the referrer even though it isn't in the same
    // directory as the file and process.cwd() is somewhere else entirely.
    const tmp = mktmpOutsideRepo()
    try {
      fs.mkdirSync(path.join(tmp, '.git'))
      const itemDir = path.join(tmp, 'data', 'Item')
      const docsDir = path.join(tmp, 'docs')
      fs.mkdirSync(itemDir, { recursive: true })
      fs.mkdirSync(docsDir, { recursive: true })
      fs.writeFileSync(path.join(itemDir, 'old-name.md'), '# hi')
      fs.writeFileSync(path.join(docsDir, 'index.md'), 'See [item](../data/Item/old-name.md)')

      const result = await renameFile(path.join(itemDir, 'old-name.md'), 'new-name.md')

      expect(result.root).toBe(tmp)
      expect(fs.readFileSync(path.join(docsDir, 'index.md'), 'utf-8')).toBe('See [item](../data/Item/new-name.md)')
    } finally {
      cleanup(tmp)
    }
  })

  test('without --root and no git repo found, falls back to the file own directory', async () => {
    const tmp = mktmpOutsideRepo()
    try {
      const itemDir = path.join(tmp, 'nested', 'deep')
      fs.mkdirSync(itemDir, { recursive: true })
      fs.writeFileSync(path.join(itemDir, 'old-name.md'), '# hi')
      // A referrer outside itemDir must NOT be updated, since no .git exists
      // anywhere up the tree and the fallback root is itemDir itself.
      fs.writeFileSync(path.join(tmp, 'outside.md'), 'See [item](./nested/deep/old-name.md)')

      const result = await renameFile(path.join(itemDir, 'old-name.md'), 'new-name.md')

      expect(result.root).toBe(itemDir)
      expect(fs.readFileSync(path.join(tmp, 'outside.md'), 'utf-8')).toBe('See [item](./nested/deep/old-name.md)')
    } finally {
      cleanup(tmp)
    }
  })
})
