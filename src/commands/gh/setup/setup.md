# GitHub Setup

Writes GitHub Actions workflows into `.github/workflows/`.

```bash
hlpr gh setup -workflow publish [projectPath]
hlpr gh setup -workflow deploy [projectPath]
hlpr gh setup -workflow <publish|deploy> -force
```

## publish

Writes `publish.yml`, which publishes to npm with [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) on `v*` tag pushes or manual dispatch. No `NPM_TOKEN` secret is needed.

- Detects the package manager from the lockfile (`bun`, `pnpm`, `yarn`, or `npm`). The install, lint, typecheck, build, and test steps use it. The publish step always runs `npm publish`, because trusted publishing is an npm CLI feature.
- TypeScript projects always get `Lint` and `Typecheck` steps. `Build` and `Test` appear only when those scripts exist.
- Refuses a `"private": true` package unless `-force` is passed.

Manual step on npmjs.com before the first publish: open `https://www.npmjs.com/package/<name>/access`, add a GitHub Actions trusted publisher with workflow filename `publish.yml`, and enable **npm publish** under allowed actions. Without that, the publish step fails with `403 OIDC permission denied for this action`.

Requirements: GitHub-hosted runners, and a public repository or a paid npm plan for provenance attestations.

## deploy

Writes `deploy.yml`, the GitHub Actions equivalent of [`hlpr az setup -workflow deploy`](../../az/setup/setup.md). On `v*` tag pushes or manual dispatch it connects to the production server over SSH and runs the same deploy commands: git sync, `.env` loading, `bun install`, Prisma or build, and `pm2 restart`.

The command asks the same questions as the Azure setup (project name, environment, Prisma, deploy path), with defaults from `.env.{environment}`. The job runs in a GitHub environment named after the target environment, so the server secrets stay scoped to it:

- `SSH_HOST`: production server host
- `SSH_USER`: deployment user
- `SSH_PRIVATE_KEY`: PEM private key whose public half is in the server's `~/.ssh/authorized_keys`

One-time setup: create the GitHub environment and its secrets, make the deploy path a git clone on the server (with read access to the repository), and create `.env` there.

Refuses to overwrite an existing `deploy.yml` unless `-force` is passed.
