# Git Setup

Sets up git hooks in the current repository.

```bash
hlpr git setup --hooks --npm
hlpr git setup --hooks --npm --force
```

`--hooks` writes a version-controlled `.githooks/pre-commit` hook and points git's `core.hooksPath` at it, so every clone shares the hook. The command works in the current directory.

`--npm` is required and selects the npm project hook. The hook runs `lint`, `typecheck` (always for TypeScript projects), and `test` (only when defined), using the package manager from the lockfile. A `prepare` script is added to `package.json` so the hook path is set again after each install. `--force` overwrites an existing hook. Other project types are not supported yet.
