# Azure Setup

Writes `azure-pipelines.yml`, which deploys to a production server over SSH from Azure Pipelines whenever a `v*` tag is pushed.

```bash
hlpr az setup -workflow deploy [projectPath]
hlpr az setup -workflow deploy -force
```

The command asks for the project name, target environment, whether the project uses Prisma, the SSH service connection name, and the deploy path. Defaults come from `.env.{environment}` (or `.env`):

- `PROJECT_NAME` overrides the project name
- `USE_PRISMA=true` makes Prisma the default answer
- `AZURE_SSH_ENDPOINT` sets the service connection (default: `{project}-{environment}-ssh`)
- `DEPLOY_PATH` sets the server path (default: `/var/www/{project}`)

The server runs `git fetch`/`reset` on `origin/main`, loads `.env`, runs `bun install` (`--production` with Prisma), then either runs Prisma migrations and `pm2 restart` (backend) or `bun run build` (frontend). Every command redirects stderr to stdout, so Azure does not mark normal output as `##[error]`.

One-time setup: create an SSH service connection in Azure DevOps with the endpoint name, make the deploy path a git clone on the server, and add the pipeline's public key to the server's `~/.ssh/authorized_keys`.

Refuses to overwrite an existing `azure-pipelines.yml` unless `-force` is passed.
