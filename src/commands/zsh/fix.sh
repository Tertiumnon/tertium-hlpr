#!/bin/bash
# @description Add bun to PATH in ~/.zshrc so new zsh sessions find it

case "$(uname -s 2>/dev/null)" in
  Darwin|Linux) ;;
  *)
    echo "Wrong OS: hlpr zsh works on macOS and Linux only." >&2
    exit 1
    ;;
esac

usage="Usage: hlpr zsh fix --bun"

case "${1:-}" in
  -h|--help)
    echo "$usage"
    echo "Write a marked PATH block for bun into ~/.zshrc (or \$ZDOTDIR/.zshrc). Running it again replaces the block."
    exit 0
    ;;
esac

if [[ $# -ne 1 || "$1" != "--bun" ]]; then
  echo "$usage" >&2
  exit 1
fi

bun_home="${BUN_INSTALL:-$HOME/.bun}"
if [[ ! -x "$bun_home/bin/bun" ]]; then
  echo "bun not found at $bun_home/bin/bun. Install it with: hlpr runtime install bun" >&2
  exit 1
fi

zshrc="${ZDOTDIR:-$HOME}/.zshrc"
start="# >>> hlpr bun >>>"
end="# <<< hlpr bun <<<"

# Keep a backup before touching the user's shell config.
if [[ -f "$zshrc" ]]; then
  backup="$zshrc.bak-$(date +%Y%m%d-%H%M%S)-$$"
  cp "$zshrc" "$backup"
  echo "Backup: $backup"
fi

# Write $HOME literally when bun lives under the home directory, so the file works on other machines.
bun_home_line="${bun_home/#$HOME/\$HOME}"
tmp="$(mktemp)"
if [[ -f "$zshrc" ]]; then
  sed "/^$start\$/,/^$end\$/d" "$zshrc" > "$tmp"
fi
{
  cat "$tmp"
  echo "$start"
  echo "export BUN_INSTALL=\"$bun_home_line\""
  echo "export PATH=\"\$BUN_INSTALL/bin:\$PATH\""
  echo "$end"
} > "$zshrc.new"
cat "$zshrc.new" > "$zshrc"
rm -f "$tmp" "$zshrc.new"

echo "✓ bun is set up in $zshrc"

# A script cannot reload your current shell, so check a fresh zsh instead.
if command -v zsh >/dev/null 2>&1; then
  found="$(zsh -ic 'command -v bun' 2>/dev/null | tail -n 1)"
  if [[ "$found" == "$bun_home/bin/bun" ]]; then
    echo "✓ New zsh sessions find bun at $found"
  else
    echo "Warning: a new zsh session did not find bun at $bun_home/bin/bun" >&2
  fi
fi
echo "Reload this terminal with: source $zshrc (or open a new terminal)"
