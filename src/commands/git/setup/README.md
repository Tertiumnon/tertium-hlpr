# Git Setup

Sets up git in the current repository.

```bash
hlpr git setup -hooks
hlpr git setup -hooks --force
```

`-hooks` writes a version-controlled `.githooks/pre-commit` hook and points git's `core.hooksPath` at it, so every clone shares the hook. The command always works in the current directory.

The hook runs `lint`, `typecheck` (always for TypeScript projects), and `test` (only when defined), using the package manager from the lockfile. A `prepare` script is added to `package.json` so the hook path is set again after each install. `--force` overwrites an existing hook.
