import { describe, expect, test } from 'bun:test'
import { transformBasename, renameRecursive } from './rename.js'
import fs from 'fs'
import path from 'path'

describe('rename module', () => {
  test('transformBasename styles', () => {
    expect(transformBasename('file-name', 'title_underscore')).toBe('File_Name')
    expect(transformBasename('file-name.md', 'snake')).toBe('file-name.md')
    // core name only
    expect(transformBasename('.gitignore', 'snake')).toBe('.gitignore')
    expect(transformBasename('mySampleFile', 'kebab')).toBe('my-sample-file')
  })

  test('renameRecursive dry run returns planned renames', async () => {
    const tmp = fs.mkdtempSync(path.join(process.cwd(), 'test-tmp-'))
    try {
      // create files and folder
      const dir = path.join(tmp, 'some-dir')
      fs.mkdirSync(dir)
      fs.writeFileSync(path.join(dir, 'file-name.md'), 'x')
      fs.writeFileSync(path.join(tmp, 'anotherFile.txt'), 'y')

      const planned = await renameRecursive(tmp, 'title_underscore', { dryRun: true })
      // expect planned to include the file-name -> File_Name.md
      const hasFile = planned.some((p) => p.to.endsWith(path.join('some-dir', 'File_Name.md')))
      expect(hasFile).toBe(true)
    } finally {
      // cleanup
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
