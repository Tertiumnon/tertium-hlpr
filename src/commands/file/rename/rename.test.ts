import { describe, expect, test } from 'bun:test'
import { transformBasename, renameRecursive } from './rename.js'
import fs from 'fs'
import path from 'path'

describe('rename module', () => {
  test('transformBasename styles', () => {
    expect(transformBasename('file-name', 'title_underscore')).toBe('File_Name')
    expect(transformBasename('file-name.md', 'snake')).toBe('file_name.md')
    // core name only
    expect(transformBasename('.gitignore', 'snake')).toBe('.gitignore')
    expect(transformBasename('mySampleFile', 'kebab')).toBe('my-sample-file')
    // pascal_underscore should be PascalCase with underscores
    expect(transformBasename('mySampleFile', 'pascal_underscore')).toBe('My_Sample_File')
    // alias equivalence: pascal_underscore == title_underscore
    expect(transformBasename('mySampleFile', 'pascal_underscore')).toBe(transformBasename('mySampleFile', 'title_underscore'))
    // multi-extension: preserve last extension
    expect(transformBasename('Deep File.testdata.js', 'kebab')).toBe('deep-file.testdata.js')
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

  test('renameRecursive updates file content references', async () => {
    const tmp = fs.mkdtempSync(path.join(process.cwd(), 'test-tmp-'))
    try {
      // create files with imports
      fs.writeFileSync(path.join(tmp, 'my-utils.js'), 'export const helper = () => {}')
      fs.writeFileSync(
        path.join(tmp, 'index.js'),
        `import { helper } from './my-utils'\nconst x = require('./my-utils')\n`
      )

      // Rename with content update enabled (default)
      await renameRecursive(tmp, 'snake', { updateContent: true })

      // Check that files were renamed
      expect(fs.existsSync(path.join(tmp, 'my_utils.js'))).toBe(true)
      expect(fs.existsSync(path.join(tmp, 'my-utils.js'))).toBe(false)

      // Check that imports were updated
      const content = fs.readFileSync(path.join(tmp, 'index.js'), 'utf-8')
      expect(content).toContain(`'./my_utils'`)
      expect(content).not.toContain(`'./my-utils'`)
    } finally {
      // cleanup
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  test('renameRecursive can skip content updates', async () => {
    const tmp = fs.mkdtempSync(path.join(process.cwd(), 'test-tmp-'))
    try {
      // create files with imports
      fs.writeFileSync(path.join(tmp, 'my-utils.ts'), 'export const helper = () => {}')
      fs.writeFileSync(
        path.join(tmp, 'index.ts'),
        `import { helper } from './my-utils'\n`
      )

      // Rename with content update disabled
      await renameRecursive(tmp, 'snake', { updateContent: false })

      // Check that files were renamed
      expect(fs.existsSync(path.join(tmp, 'my_utils.ts'))).toBe(true)

      // Check that imports were NOT updated
      const content = fs.readFileSync(path.join(tmp, 'index.ts'), 'utf-8')
      expect(content).toContain(`'./my-utils'`)
      expect(content).not.toContain(`'./my_utils'`)
    } finally {
      // cleanup
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  test('renameRecursive updates imports with different quote styles', async () => {
    const tmp = fs.mkdtempSync(path.join(process.cwd(), 'test-tmp-'))
    try {
      // create test files
      fs.writeFileSync(path.join(tmp, 'myFile.js'), 'export const x = 1')
      fs.writeFileSync(
        path.join(tmp, 'test.js'),
        `import a from './myFile'\nimport b from "./myFile"\nimport c from \`./myFile\`\n`
      )

      await renameRecursive(tmp, 'kebab', { updateContent: true })

      const content = fs.readFileSync(path.join(tmp, 'test.js'), 'utf-8')
      expect(content).toContain(`'./my-file'`)
      expect(content).toContain(`"./my-file"`)
      expect(content).toContain(`\`./my-file\``)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  test('renameRecursive updates various text file types', async () => {
    const tmp = fs.mkdtempSync(path.join(process.cwd(), 'test-tmp-'))
    try {
      // create test files with different extensions
      fs.writeFileSync(path.join(tmp, 'myModule.py'), '# python file')
      fs.writeFileSync(path.join(tmp, 'config.yml'), `import: './myModule'`)
      fs.writeFileSync(path.join(tmp, 'readme.md'), `import './myModule' from file`)
      fs.writeFileSync(path.join(tmp, 'script.sh'), `source './myModule'`)
      fs.writeFileSync(path.join(tmp, 'data.txt'), `require("./myModule")`)

      await renameRecursive(tmp, 'snake', { updateContent: true })

      // Check .yml file was updated
      const ymlContent = fs.readFileSync(path.join(tmp, 'config.yml'), 'utf-8')
      expect(ymlContent).toContain(`'./my_module'`)

      // Check .md file was updated
      const mdContent = fs.readFileSync(path.join(tmp, 'readme.md'), 'utf-8')
      expect(mdContent).toContain(`'./my_module'`)

      // Check .sh file was updated
      const shContent = fs.readFileSync(path.join(tmp, 'script.sh'), 'utf-8')
      expect(shContent).toContain(`'./my_module'`)

      // Check .txt file was updated
      const txtContent = fs.readFileSync(path.join(tmp, 'data.txt'), 'utf-8')
      expect(txtContent).toContain(`"./my_module"`)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  test('renameRecursive skips binary files', async () => {
    const tmp = fs.mkdtempSync(path.join(process.cwd(), 'test-tmp-'))
    try {
      // create a binary file (PNG header)
      const binaryData = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
      fs.writeFileSync(path.join(tmp, 'image.png'), binaryData)
      fs.writeFileSync(path.join(tmp, 'myFile.js'), 'export const x = 1')

      // Should not throw when encountering binary files
      await renameRecursive(tmp, 'snake', { updateContent: true })

      // Binary file should still exist and be unchanged
      const pngContent = fs.readFileSync(path.join(tmp, 'image.png'))
      expect(pngContent).toEqual(binaryData)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
