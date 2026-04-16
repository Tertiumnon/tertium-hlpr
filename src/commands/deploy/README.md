# Deploy Command

Automated deployment tool for Node.js/Bun projects using SSH and SCP with shell script execution.

## Features

- **Automatic .env loading** - Reads environment variables from `.env` file automatically
- **Variable validation** - Ensures all required variables are set
- **Shell script execution** - Runs deployment steps line-by-line with cross-platform support
- **Build orchestration** - Runs local build before deployment (unless `skip-build` specified)
- **Remote deployment** - Uses SCP to copy files and SSH to execute commands
- **Cross-platform** - Works on Windows, macOS, and Linux (shell: true handles platform differences)

## Architecture

```
deploy.ts (TypeScript)
├── Loads .env file
├── Validates variables
├── Substitutes {{VARIABLE}} placeholders
└── Executes deploy.sh line-by-line with shell: true

deploy.sh (Shell script)
├── Build phase (if not skip-build)
├── SCP phase (copy files to remote)
└── SSH phase (install dependencies & restart service)
```

## Usage

```bash
# Full deployment (build + deploy)
hlpr deploy

# Deploy only (skip build if already built)
hlpr deploy skip-build
```

## Configuration

Create a `.env` file in your project root with the following variables:

```env
DEPLOY_USER=username           # SSH username
DEPLOY_HOST=hostname           # SSH hostname or IP
DEPLOY_PATH=/path/to/remote    # Remote deployment directory
APP_NAME=app-name              # PM2 app name
```

## How It Works

1. **TypeScript orchestration** (`deploy.ts`):
   - Reads and parses `.env` file from project directory
   - Validates all required environment variables
   - Loads `deploy.sh` shell script
   - Substitutes `{{VARIABLE}}` placeholders with values from `.env`

2. **Shell script execution** (`deploy.sh`):
   - Each line executed with `shell: true` (handles Windows/Unix automatically)
   - If not `skip-build`: Runs `bun run build`
   - Executes `scp -r dist/` to copy files to remote server
   - Executes `ssh` commands:
     - Navigate to deployment directory
     - Run `bun install --production`
     - Restart PM2 process with `pm2 restart $APP_NAME --update-env`

## Requirements

- Node.js >= 14
- Bun (for building)
- SSH and SCP configured for remote server access
- PM2 installed on remote server
- `.env` file with required variables

## Example

```bash
# In your project directory
hlpr deploy
# or
hlpr deploy skip-build
```

## Customizing Deployment Steps

Edit `deploy/deploy.sh` to modify deployment logic:

```bash
#!/bin/bash
# @description Deploy application to remote server

# Your custom steps here
echo "Deploying to $DEPLOY_HOST"
bun run build
scp -r dist/ $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/
ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && pm2 restart $APP_NAME"
```

Variables are automatically substituted before execution.
