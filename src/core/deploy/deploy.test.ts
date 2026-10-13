import { describe, expect, test } from 'bun:test'
import { type DeployConfig, buildAzureYaml, buildGithubDeployYaml, buildSshCommands } from './deploy.js'

const backend: DeployConfig = {
  projectName: 'test-api',
  environment: 'production',
  deployPath: '/var/www/test-api',
  hasPrisma: true,
  appName: 'test-api',
  sshEndpoint: 'test-api-prod-ssh',
}
const frontend: DeployConfig = {
  projectName: 'test-www',
  environment: 'production',
  deployPath: '/var/www/test-www',
  hasPrisma: false,
  sshEndpoint: 'test-www-prod-ssh',
}

describe('deploy commands', () => {
  test('backend runs Prisma and pm2 with production install; frontend builds instead', () => {
    const backendCommands = buildSshCommands(backend)
    expect(backendCommands[0]).toBe('cd /var/www/test-api')
    expect(backendCommands.some(cmd => cmd.includes('prisma migrate'))).toBe(true)
    expect(backendCommands.some(cmd => cmd.includes('pm2 restart'))).toBe(true)
    expect(backendCommands.find(cmd => cmd.includes('bun install'))).toContain('--production')

    const frontendCommands = buildSshCommands(frontend)
    expect(frontendCommands.some(cmd => cmd.includes('prisma'))).toBe(false)
    expect(frontendCommands.some(cmd => cmd.includes('bun run build'))).toBe(true)
    expect(frontendCommands.find(cmd => cmd.includes('bun install'))).not.toContain('--production')
  })

  test('azure pipeline keeps the SSH@0 task, endpoint and PATH export', () => {
    const yaml = buildAzureYaml(backend)
    expect(yaml).toContain('- v*')
    expect(yaml).toContain("sshEndpoint: 'test-api-prod-ssh'")
    expect(yaml).toContain('task: SSH@0')
    expect(yaml).toContain('git reset --hard origin/main')
    expect(yaml).toContain('export PATH="$HOME/.bun/bin:$PATH"')
    expect(yaml).toContain('        cd /var/www/test-api')
  })

  test('azure pipeline needs an SSH endpoint', () => {
    expect(() => buildAzureYaml({ ...backend, sshEndpoint: undefined })).toThrow('SSH service connection')
  })

  test('github deploy workflow runs the same commands over SSH from environment secrets', () => {
    const yaml = buildGithubDeployYaml(backend)
    expect(yaml).toContain('tags:\n      - "v*"')
    expect(yaml).toContain('environment: production')
    expect(yaml).toContain('uses: appleboy/ssh-action@v1.2.0')
    expect(yaml).toContain(`host: \${{ secrets.SSH_HOST }}`)
    expect(yaml).toContain(`key: \${{ secrets.SSH_PRIVATE_KEY }}`)
    expect(yaml).toContain('            cd /var/www/test-api')
    expect(yaml).toContain('            pm2 restart test-api')
  })
})
