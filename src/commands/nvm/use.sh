#!/bin/bash
# @description Switch to an installed Node.js version with nvm

if [[ "$1" != "-v" && "$1" != "-version" ]] || [[ -z "$2" ]]; then
  echo "Usage: hlpr nvm use <-v|-version> <lts|version>" >&2
  exit 1
fi

if [[ "$2" == "lts" ]]; then
  version="--lts"
elif [[ "$2" =~ ^[0-9]+([.][0-9]+){0,2}$ ]]; then
  version="$2"
else
  echo "Invalid Node.js version: $2" >&2
  exit 1
fi

if ! command -v nvm >/dev/null 2>&1; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  [[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
fi

command -v nvm >/dev/null 2>&1 || { echo "nvm is not installed. Run: hlpr install nvm" >&2; exit 1; }
# shortcut: nvm-sh cannot change its parent shell, add shell integration for persistent switching
nvm use "$version"
echo "Note: run 'nvm use $2' directly in your current shell to keep this version active."
