# Deploy Command

Automated deployment tool for Node.js/Bun projects using SSH and SCP.

## Features

- **Automatic .env loading** - Reads environment variables from .env file
- **Variable validation** - Ensures all required variables are set
- **Build orchestration** - Runs local build before deployment
- **Remote deployment** - Uses SCP to copy files and SSH to execute commands
- **Cross-platform** - Works on Windows, macOS, and Linux

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
APP_PORT=8080                  # Application port
```

## How It Works

1. Reads and parses `.env` file from project directory
2. Validates all required environment variables
3. Runs `bun run build` (unless `skip-build` specified)
4. Uses `scp -r dist/` to copy built files to remote server
5. Uses `ssh` to execute remote commands:
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
