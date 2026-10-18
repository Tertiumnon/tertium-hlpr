# Angular Setup

Prepares an Angular project for this team's workflow. Works for Angular and Angular universal (SSR, `@angular/ssr`) projects. Each step is committed separately.

```bash
hlpr angular setup [projectPath]
```

Steps, in order:

1. Requires a clean git working tree, then checks out `develop`
2. Pins `packageManager` to the installed bun version
3. Moves an npm project to bun: removes `package-lock.json`, runs `bun install`
4. Adds the `dev` script (`ng serve`) if it is missing. Universal projects also get a `start` script (`node <outputPath>/server/server.mjs`, read from `angular.json`) if it is missing
5. Adds `@biomejs/biome` with a `biome.json` (2-space indent, matching @tertium/js), plus `lint` (`biome check --write .`) and `fmt` (`biome format --write .`) scripts
6. Adds `@tertium/js` as a dev dependency
7. Sets `typecheck` to check every existing Angular tsconfig (`tsconfig.app.json`, and `tsconfig.server.json` for universal projects), then writes `.githooks/pre-commit` (lint, typecheck, and test when defined) and sets `core.hooksPath`
8. Adds the `version` script that generates `CHANGELOG.md` through `@tertium/js`

Limits: step 8 needs `@tertium/js` in `node_modules`, so it is set up after step 6. The `test` script is run by the pre-commit hook, so `ng test` must finish without watch mode when git runs it.
