import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setupAzureDeployPipeline } from '../../../core/az/pipeline.js'
import { parseSetupArgs } from './setup.js'

describe('az setup', () => {
  test('requires -workflow deploy, optional project path and -force', () => {
    expect(parseSetupArgs(['-workflow', 'deploy'])).toEqual({ workflow: 'deploy', projectPath: process.cwd(), force: false })
    expect(parseSetupArgs(['-workflow', 'deploy', './app', '-force']).force).toBe(true)
    expect(() => parseSetupArgs(['-workflow', 'publish'])).toThrow('Usage: hlpr az setup')
    expect(() => parseSetupArgs(['deploy'])).toThrow('Usage: hlpr az setup')
  })

  test('refuses to overwrite azure-pipelines.yml without -force, before prompting', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlpr-az-setup-'))
    try {
      fs.writeFileSync(path.join(dir, 'azure-pipelines.yml'), 'existing')
      await expect(setupAzureDeployPipeline(dir)).rejects.toThrow('already exists')
      expect(fs.readFileSync(path.join(dir, 'azure-pipelines.yml'), 'utf8')).toBe('existing')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
