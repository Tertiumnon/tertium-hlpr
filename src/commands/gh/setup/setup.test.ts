import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildPublishWorkflow, setupDeployWorkflow, setupPublishWorkflow } from '../../../core/gh/workflow.js'
import { parseSetupArgs } from './setup.js'

describe('gh setup args', () => {
  test('requires a known workflow and accepts an optional project path and -force', () => {
    expect(parseSetupArgs(['-workflow', 'publish'])).toEqual({ workflow: 'publish', projectPath: process.cwd(), force: false })
    expect(parseSetupArgs(['-workflow', 'publish', './app', '-force'])).toEqual({ workflow: 'publish', projectPath: './app', force: true })
    expect(() => parseSetupArgs([])).toThrow('Usage: hlpr gh setup')
    expect(parseSetupArgs(['-workflow', 'deploy']).workflow).toBe('deploy')
    expect(() => parseSetupArgs(['-workflow', 'lint'])).toThrow('Usage: hlpr gh setup')
    expect(() => parseSetupArgs(['publish'])).toThrow('Usage: hlpr gh setup')
    expect(() => parseSetupArgs(['-workflow', 'publish', '-dry'])).toThrow('Unknown option -dry')
  })
})

describe('publish workflow', () => {
  test('uses bun steps and includes build and test only when defined', () => {
    const yaml = buildPublishWorkflow({ scripts: { test: 'bun test' } }, 'bun', true)
    expect(yaml).toContain('run: bun install --frozen-lockfile')
    expect(yaml).toContain('run: bun run lint')
    expect(yaml).toContain('run: bun run typecheck')
    expect(yaml).toContain('run: bun run test')
    expect(yaml).not.toContain('Build')
    expect(yaml).toContain('run: npm publish')
  })

  test('writes the workflow, and refuses private packages and overwrites without -force', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-gh-setup-'))
    try {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'pkg' }))
      setupPublishWorkflow(dir)
      expect(fs.readFileSync(path.join(dir, '.github', 'workflows', 'publish.yml'), 'utf8')).toContain('name: Publish to npm')
      expect(() => setupPublishWorkflow(dir)).toThrow('already exists')

      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'pkg', private: true }))
      expect(() => setupPublishWorkflow(dir, { force: true })).not.toThrow()
      fs.rmSync(path.join(dir, '.github'), { recursive: true, force: true })
      expect(() => setupPublishWorkflow(dir)).toThrow('marked "private"')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('gh deploy workflow', () => {
  test('refuses to overwrite deploy.yml without -force, before prompting', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-gh-deploy-'))
    try {
      fs.mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true })
      fs.writeFileSync(path.join(dir, '.github', 'workflows', 'deploy.yml'), 'existing')
      await expect(setupDeployWorkflow(dir)).rejects.toThrow('already exists')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
