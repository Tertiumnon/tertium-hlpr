import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { askWith, collectDeployConfig } from '../deploy/config.js'
import { type DeployConfig, buildAzureYaml } from '../deploy/deploy.js'

export const AZURE_PIPELINE_NAME = 'azure-pipelines.yml'

export async function setupAzureDeployPipeline(projectPath: string, options: { force?: boolean } = {}): Promise<void> {
  const pipelinePath = path.join(projectPath, AZURE_PIPELINE_NAME)
  if (existsSync(pipelinePath) && !options.force) throw new Error(`${pipelinePath} already exists. Pass -force to overwrite it.`)

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  let config: DeployConfig
  try {
    console.log('\n🚀 Azure Deployment Pipeline Setup\n')
    config = await collectDeployConfig(askWith(rl), projectPath, { withSsh: true })
  } finally {
    rl.close()
  }

  writeFileSync(pipelinePath, buildAzureYaml(config))
  console.log(`
✅ Wrote ${pipelinePath}

📋 Configuration:
   - Project: ${config.projectName}
   - Environment: ${config.environment}
   - SSH endpoint: ${config.sshEndpoint}
   - Deploy path: ${config.deployPath}
   - App name: ${config.appName ?? '(static site)'}
   - Prisma: ${config.hasPrisma ? 'yes' : 'no'}

📌 One-time setup required:
   1. Azure DevOps → Project Settings → Service connections → New SSH connection
      - Name: ${config.sshEndpoint}
      - Host: (your production server), Port: 22, Username: (deployment user)
      - Private key: your SSH private key in PEM format
   2. On the production server, make ${config.deployPath} a git clone of the repository,
      create .env, and add the pipeline's SSH public key to ~/.ssh/authorized_keys.

🚀 To deploy: npm run release:patch (pushes a v* tag, which triggers the pipeline)
`)
}
