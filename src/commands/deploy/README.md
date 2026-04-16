# Deploy Command

Simple SCP-based deployment tool for pushing built applications to remote servers.

## Usage

```bash
hlpr deploy [config-file]
```

Defaults to `deploy.config.yml` in current directory if no config file specified.

## Configuration File (YAML)

Create `deploy.config.yml` in your project:

```yaml
# Remote server details
remoteHost: drh-mini
remoteUser: vitba

# Deployment paths
deployPath: /var/www/dragons-legends.gm.server
appName: dragons-legends.gm.server

# Local build directory
localDist: ./dist

# Optional: Environment file to copy
envFile: .env

# Optional: Port for PM2 environment
port: 8080

# Optional: Skip steps
skipInstall: false
skipRestart: false
```

## What It Does

1. **Copies dist folder** via SCP to remote server
2. **Copies .env file** (if specified and exists)
3. **Copies package.json** (for reference on remote)
4. **Installs dependencies** on remote: `bun install --production`
5. **Restarts PM2** process with environment variables

## Requirements

- SSH access configured to remote server
- `scp` command available
- `bun` installed on remote server (for dependency install)
- `pm2` installed on remote server (for process management)
- **dist/ folder already built locally** (this tool doesn't build)

## Example

Assuming you've built your app locally:

```bash
# Build locally first
bun run build

# Deploy to server
hlpr deploy deploy.config.yml
```

## Tips

- Always build locally before deploying: `bun run build`
- Use `skipInstall: true` to skip dependency installation
- Use `skipRestart: true` to skip PM2 restart (for testing)
- SSH key must be configured for passwordless access
