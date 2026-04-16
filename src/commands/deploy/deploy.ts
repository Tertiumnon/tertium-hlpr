#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

// Load .env file
function loadEnv(projectDir: string): Record<string, string> {
  const envPath = path.join(projectDir, '.env');
  if (!existsSync(envPath)) {
    console.error('Error: .env file not found');
    console.error(`Please copy .env.example to .env in ${projectDir}`);
    process.exit(1);
  }

  const env: Record<string, string> = {};
  const content = readFileSync(envPath, 'utf-8');

  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });

  return env;
}

// Validate environment variables
function validate(env: Record<string, string>) {
  const required = ['DEPLOY_USER', 'DEPLOY_HOST', 'DEPLOY_PATH', 'APP_NAME'];
  const missing = required.filter(key => !env[key]);

  if (missing.length > 0) {
    console.error(`Error: Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Main deploy function
function deploy() {
  const projectDir = process.cwd();
  const env = loadEnv(projectDir);
  validate(env);

  console.log(`\nDeploying to ${env.DEPLOY_HOST}:${env.DEPLOY_PATH}\n`);

  try {
    // Copy files via SCP
    const scpCmd = `scp -r dist/ ${env.DEPLOY_USER}@${env.DEPLOY_HOST}:${env.DEPLOY_PATH}/`;
    console.log(`→ ${scpCmd}`);
    execSync(scpCmd, {
      stdio: 'inherit',
      cwd: projectDir,
      shell: true
    } as any);

    // Restart service via SSH
    const sshCmd = `ssh ${env.DEPLOY_USER}@${env.DEPLOY_HOST} "cd ${env.DEPLOY_PATH} && bun install --production && pm2 restart ${env.APP_NAME} --update-env"`;
    console.log(`→ ${sshCmd}`);
    execSync(sshCmd, {
      stdio: 'inherit',
      cwd: projectDir,
      shell: true
    } as any);

    console.log('\n✓ Deployment complete!\n');
  } catch (error: any) {
    console.error(`\n✗ Deployment failed: ${error.message}\n`);
    process.exit(1);
  }
}

deploy();
