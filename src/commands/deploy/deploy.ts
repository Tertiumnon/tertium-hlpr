#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

// Load .env file
function loadEnv(projectDir: string) {
  const envPath = path.join(projectDir, '.env');
  if (!existsSync(envPath)) {
    console.error('Error: .env file not found');
    console.error(`Please copy .env.example to .env in ${projectDir}`);
    process.exit(1);
  }

  const env = { ...process.env };
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
function validate(env: Record<string, string | undefined>) {
  const required = ['DEPLOY_USER', 'DEPLOY_HOST', 'DEPLOY_PATH', 'APP_NAME', 'APP_PORT'];
  const missing = required.filter(key => !env[key]);

  if (missing.length > 0) {
    console.error(`Error: Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Main deploy function
async function deploy() {
  const skipBuild = process.argv[2] === 'skip-build';
  const projectDir = process.cwd(); // Use current working directory as project dir
  const env = loadEnv(projectDir);
  validate(env);

  console.log(`\nDeploying to ${env.DEPLOY_HOST}:${env.DEPLOY_PATH}`);
  console.log('========================================\n');

  try {
    // Build phase
    if (!skipBuild) {
      console.log('Building...');
      execSync('bun run build', {
        stdio: 'inherit',
        env: env,
        cwd: projectDir
      });
    }

    // Deploy phase
    console.log('\nCopying files to remote server...');
    const scpCmd = `scp -r dist/ ${env.DEPLOY_USER}@${env.DEPLOY_HOST}:${env.DEPLOY_PATH}/`;
    execSync(scpCmd, {
      stdio: 'inherit',
      env: env,
      cwd: projectDir,
      shell: true
    });

    console.log('\nInstalling dependencies and restarting service...');
    const sshCmd = `ssh ${env.DEPLOY_USER}@${env.DEPLOY_HOST} "cd ${env.DEPLOY_PATH} && bun install --production && pm2 restart ${env.APP_NAME} --update-env"`;
    execSync(sshCmd, {
      stdio: 'inherit',
      env: env,
      cwd: projectDir,
      shell: true
    });

    console.log('\n✓ Deployment complete!\n');
  } catch (error: any) {
    console.error(`\n✗ Deployment failed: ${error.message}\n`);
    process.exit(1);
  }
}

deploy();
