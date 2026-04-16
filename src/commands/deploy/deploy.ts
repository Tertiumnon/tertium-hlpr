#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Execute shell script line by line with shell: true (handles cross-platform)
function executeScript(scriptContent: string, variables: Record<string, string>, cwd: string) {
  // Substitute variables in script
  let script = scriptContent;
  for (const [key, value] of Object.entries(variables)) {
    script = script.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  // Extract and execute non-comment, non-empty lines
  const lines = script.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip shebang, comments, empty lines, and bash variable assignments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('#!/')) continue;
    if (/^[A-Z_][A-Z0-9_]*=/.test(trimmed)) continue; // Skip VAR="value" lines

    try {
      console.log(`→ ${trimmed}`);
      execSync(trimmed, {
        stdio: 'inherit',
        cwd,
        shell: true
      } as any);
    } catch (error: any) {
      console.error(`\n✗ Command failed: ${trimmed}\n`);
      process.exit(1);
    }
  }
}

// Main deploy function
function deploy() {
  const skipBuild = process.argv[2] === 'skip-build';
  const projectDir = process.cwd();
  const env = loadEnv(projectDir);
  validate(env);

  // Load shell script
  const scriptPath = path.join(__dirname, 'deploy.sh');
  if (!existsSync(scriptPath)) {
    console.error(`Error: Deploy script not found at ${scriptPath}`);
    process.exit(1);
  }

  const scriptContent = readFileSync(scriptPath, 'utf-8');

  // Prepare variables for substitution
  const variables = {
    ...env,
    SKIP_BUILD: skipBuild ? 'true' : 'false'
  };

  console.log(`\nDeploying to ${env.DEPLOY_HOST}:${env.DEPLOY_PATH}`);
  console.log('==========================================\n');

  try {
    executeScript(scriptContent, variables, projectDir);
  } catch (error: any) {
    console.error(`\n✗ Deployment failed: ${error.message}\n`);
    process.exit(1);
  }
}

deploy();
