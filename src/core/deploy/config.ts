import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Interface } from 'node:readline/promises'
import type { DeployConfig } from './deploy.js'

export type Ask = (question: string, defaultValue?: string) => Promise<string>

export function askWith(rl: Interface): Ask {
  return async (question, defaultValue) => {
    const answer = await rl.question(defaultValue ? `${question} [${defaultValue}] ` : `${question} `)
    return answer || defaultValue || ''
  }
}

// Prefers .env.{environment} (.env.prod, .env.staging, ...) and falls back to .env.
export function loadEnvFile(projectPath: string, environment: string): Record<string, string> {
  const envPath = path.join(projectPath, `.env.${environment}`)
  const fileToRead = existsSync(envPath) ? envPath : path.join(projectPath, '.env')
  const env: Record<string, string> = {}
  if (!existsSync(fileToRead)) return env

  for (const line of readFileSync(fileToRead, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...valueParts] = trimmed.split('=')
    if (key) env[key.trim()] = valueParts.join('=').trim()
  }
  return env
}

// Asks for the deploy settings. Defaults come from the environment's .env file and the project directory name.
export async function collectDeployConfig(ask: Ask, projectPath: string, options: { withSsh: boolean }): Promise<DeployConfig> {
  const projectName = await ask('Project name:', path.basename(path.resolve(projectPath)))
  const environment = await ask('Target environment (production, staging, development):', 'production')
  const envVars = loadEnvFile(projectPath, environment)
  const finalProjectName = envVars.PROJECT_NAME || projectName

  const usePrisma = ['true', 'yes'].includes(envVars.USE_PRISMA?.toLowerCase() ?? '')
  const hasPrisma = (await ask('Does this project use Prisma? (yes/no):', usePrisma ? 'yes' : 'no')).toLowerCase().startsWith('y')

  const sshEndpoint = options.withSsh
    ? await ask('SSH service connection name:', envVars.AZURE_SSH_ENDPOINT || `${finalProjectName}-${environment}-ssh`)
    : undefined
  const deployPath = await ask('Deploy path on production server:', envVars.DEPLOY_PATH || `/var/www/${finalProjectName}`)

  return {
    projectName: finalProjectName,
    environment,
    deployPath,
    hasPrisma,
    appName: hasPrisma ? finalProjectName : undefined,
    sshEndpoint,
  }
}
