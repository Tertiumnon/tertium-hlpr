#!/usr/bin/env node
import { parseWorkflowArgs } from '../../../core/command/workflow-args.js'
import { type WorkflowName, WORKFLOW_NAMES, setupDeployWorkflow, setupPublishWorkflow } from '../../../core/gh/workflow.js'

// @description Set up GitHub Actions workflows: npm publish (trusted publishing) and SSH deploy

// Literal on purpose: `hlpr help` scrapes "Usage:" lines from this source file.
const USAGE = 'Usage: hlpr gh setup -workflow <publish|deploy> [projectPath] [-force]'

const SETUP: Record<WorkflowName, (projectPath: string, options: { force?: boolean }) => void | Promise<void>> = {
  publish: setupPublishWorkflow,
  deploy: setupDeployWorkflow,
}

export function parseSetupArgs(args: string[]) {
  return parseWorkflowArgs(args, WORKFLOW_NAMES, USAGE)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`${USAGE}\npublish: writes .github/workflows/publish.yml, which publishes to npm with trusted publishing (OIDC) on "v*" tag pushes.\ndeploy: writes .github/workflows/deploy.yml, which deploys over SSH on "v*" tag pushes, using the GitHub environment secrets SSH_HOST, SSH_USER and SSH_PRIVATE_KEY.\nOptions: -force overwrites an existing workflow, or proceeds for a private package.`)
    return
  }
  const { workflow, projectPath, force } = parseSetupArgs(args)
  await SETUP[workflow](projectPath, { force })
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
