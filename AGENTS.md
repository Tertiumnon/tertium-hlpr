# Working on hlpr

Make everyday CLI tasks simpler across Windows, macOS, and Linux. Prefer useful
commands with natural, consistent names and the smallest complete implementation.
Reuse existing patterns and native tools; avoid unnecessary dependencies and options.

## When commands change

- Keep help current whenever adding, renaming, removing, or changing a command or flag.
  Check both general help implementations: `src/index.ts` and
  `src/commands/help/help.ts`, plus the affected command's `--help` output.
- Help must show valid syntax, current examples, and runnable commands only—not
  type files, tests, or other helpers. Update the help regression test when needed.
- Update the command's README and the root README command table. Keep the root
  README minimal; put detailed options, requirements, and limitations in command docs.
- Check callers, aliases in `src/core/command/aliases.ts`, tests, and scripts for
  references to old names or arguments.
- Follow the existing `src/commands/<command>/<command>.ts` or
  `src/commands/<category>/<command>/<command>.ts` layout. Build and help discovery
  rely on these names. `bin/` is generated; do not edit or commit it.

## Behavior and compatibility

- Keep the user-facing command consistent across environments; use platform-specific
  tools internally where needed. Document required tools and unsupported platforms.
- Validate arguments, report failures clearly, and return a nonzero exit code on
  failure. Preserve safeguards against data loss and unintended destructive actions.
- State limitations accurately: cached device lists are not active discovery, and
  parsing fixtures do not prove execution works on another operating system.

## Verification

- Add focused tests for new behavior and regressions. Use temporary fixtures for
  filesystem or Git tests; never operate on the user's real data in tests.
- For code changes, run relevant tests, `bun run lint`, `bun run typecheck`, and
  `bun run build`. The commit hook runs build, lint, typecheck, and the full test suite.
- Verify CLI/help changes with `node bin/index.js help` and the affected command.
  A global `hlpr` may point to an older installation; check its version and resolved
  path before diagnosing stale output.
- On Windows, shell tests require Git Bash ahead of the WSL Bash launcher on PATH.
- For documentation-only changes, check links and `git diff --check`; no test run
  is needed. Report what was verified and any untested platforms or known limits.
