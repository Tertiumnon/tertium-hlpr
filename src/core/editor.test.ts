import { describe, expect, test } from 'bun:test'
import { editorCommand, editorFlagCommand } from './editor.js'

describe('editor choice', () => {
  test('maps -editor values to commands, with code waiting for its tab to close', () => {
    expect(editorFlagCommand('code')).toBe('code --wait')
    expect(editorFlagCommand('edit')).toBe('edit')
    expect(editorFlagCommand('nano')).toBe('nano')
    expect(editorFlagCommand('vi')).toBe('vi')
  })

  test('rejects anything else, including object property names', () => {
    expect(() => editorFlagCommand('notepad')).toThrow('Invalid -editor: use code, edit, nano or vi')
    expect(() => editorFlagCommand('constructor')).toThrow('Invalid -editor')
  })

  test('-editor wins over the environment', () => {
    expect(editorCommand('nano')).toBe('nano')
  })
})
