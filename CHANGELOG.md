# Changelog

## Unreleased

- **Removed: `hlpr git` commands.** They now live in [`@tertium/gith`](https://www.npmjs.com/package/@tertium/gith), the git helper that also covers the branch flow (`create`, `merge`, `release`). Why: git workflow belongs in one tool, and the branch and cleanup commands were duplicated there. `hlpr git setup -hooks` is also gone; `hlpr angular setup` still writes the same shared pre-commit hook.

  | Removed from hlpr | Use in gith |
  | --- | --- |
  | `hlpr git create -branch <b>` (branch without switching) | `gith create -b <b>` starts a work branch from develop and switches to it |
  | `hlpr git switch -branch <b>` | `gith switch -b <b>` |
  | `hlpr git remove -branch <b>` / `rm -b` | `gith remove -b <b>` (`gith rm` also works) |
  | `hlpr git rm <b> -remote` | `gith remove -b <b> --remote` |
  | `hlpr git rm <b> -both` | `gith remove -b <b> --both` |
  | `hlpr git sync` | `gith sync` |
  | `hlpr git clean` | `gith clean` |
  | `hlpr git setup -hooks [--force]` | `gith setup --hooks [--force]` |

## 0.18.0 - 2026-10-16

- docs: update root command table and AGENTS example
- fix(help): show runnable "also" commands and source descriptions
- refactor(runtime): match install help with tool install
- feat(system): read Linux RAM modules with dmidecode
- feat(zsh): add fix --bun to put bun on PATH in .zshrc
- feat(tool): add Claude, Codex, and Copilot CLI installs
- feat(ssh): add mkkey, setup, and fix; rename mkconn to mkcon
- fix: make info output color explicit so tests are TTY-independent
- feat(app): search remote package catalogs with --remote

## 0.17.0 - 2026-10-16

- feat: process kill -folder, -file and -path targets

## 0.16.0 - 2026-10-13

- feat: add angular, npm, git, gh, az and ssh read commands with changelog

