# zsh

Fix zsh shell setup for tools installed under your home directory.

## fix --bun

Run `hlpr zsh fix --bun` when `bun` works in other shells but zsh reports
`command not found`. The command:

1. Finds bun at `$BUN_INSTALL/bin/bun`, or `~/.bun/bin/bun` when `BUN_INSTALL` is unset. If it is missing, it stops and suggests `hlpr runtime install bun`.
2. Backs up `~/.zshrc` (or `$ZDOTDIR/.zshrc`) to `.zshrc.bak-...`.
3. Writes a block between `# >>> hlpr bun >>>` and `# <<< hlpr bun <<<` that exports `BUN_INSTALL` and adds `$BUN_INSTALL/bin` to `PATH`. Running the command again replaces that block; other lines are kept.
4. If zsh is installed, starts a new zsh session to confirm it finds bun.

A script cannot reload the terminal you are typing in, so run the printed command
(`source ~/.zshrc`) or open a new terminal afterward.

Requires zsh and bun on macOS or Linux. On Windows the command stops with a `Wrong OS` error.
