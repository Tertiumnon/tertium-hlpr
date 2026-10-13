import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ensureScripts, suggestedScripts } from '../../../core/npm/scripts.js'

const noServer = (): string => {
  throw new Error('serverEntry should not be needed')
}

describe('npm scripts', () => {
  test('suggests framework commands', () => {
    expect(suggestedScripts({ dependencies: { '@angular/core': '^20.0.0' } }, noServer).dev).toBe('ng serve')
    expect(suggestedScripts({ devDependencies: { vite: '^7.0.0' } }, noServer).start).toBe('vite preview')
    expect(suggestedScripts({}, noServer).dev).toBe('node .')
  })

  test('universal (SSR) projects start the built Node server', () => {
    const suggested = suggestedScripts({ dependencies: { '@angular/core': '^20.0.0', '@angular/ssr': '^20.0.0' } }, () => 'dist/app/server/server.mjs')
    expect(suggested).toEqual({ dev: 'ng serve', start: 'node dist/app/server/server.mjs', description: 'Angular universal (SSR)' })
  })

  test('adds missing scripts, keeps existing ones unless forced', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-npm-scripts-'))
    try {
      const packageJsonPath = path.join(dir, 'package.json')
      fs.writeFileSync(packageJsonPath, JSON.stringify({ dependencies: { '@angular/core': '^20.0.0' }, scripts: { start: 'custom' } }))

      expect(ensureScripts(dir)).toBe(true)
      expect(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).scripts).toEqual({ start: 'custom', dev: 'ng serve' })
      expect(ensureScripts(dir)).toBe(false)

      expect(ensureScripts(dir, { force: true })).toBe(true)
      expect(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).scripts).toEqual({ start: 'ng serve', dev: 'ng serve' })
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('universal start script reads the server output from angular.json', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-npm-ssr-'))
    try {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { '@angular/ssr': '^20.0.0' } }))
      fs.writeFileSync(path.join(dir, 'angular.json'), JSON.stringify({ projects: { site: { architect: { build: { options: { outputPath: { base: 'dist/site', browser: '' } } } } } } }))

      ensureScripts(dir)

      expect(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).scripts).toEqual({ start: 'node dist/site/server/server.mjs', dev: 'ng serve' })
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
