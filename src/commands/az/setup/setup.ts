#!/usr/bin/env node
import { setupAzureDeployPipeline } from '../../../core/az/pipeline.js'
import { parseWorkflowArgs } from '../../../core/command/workflow-args.js'

// @description Set up an Azure Pipelines deploy over SSH (azure-pipelines.yml)

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr az setup -workflow <deploy> [projectPath] [-force]'
const WORKFLOWS = ['deploy'] as const

export function parseSetupArgs(args: string[]) {
  return parseWorkflowArgs(args, WORKFLOWS, USAGE)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\nWrites azure-pipelines.yml, which deploys over SSH from an Azure Pipelines service connection on "v*" tag pushes.\nPrompts for the project settings, with defaults from .env.{environment} (or .env).\nOptions: -force overwrites an existing azure-pipelines.yml.`)
    return
  }
  const { projectPath, force } = parseSetupArgs(args)
  await setupAzureDeployPipeline(projectPath, { force })
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
