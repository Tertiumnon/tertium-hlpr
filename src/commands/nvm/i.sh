#!/bin/bash
# @description Install a Node.js version with nvm

if [[ "$1" != "-v" && "$1" != "-version" ]] || [[ -z "$2" ]]; then
  echo "Usage: hlpr nvm i <-v|-version> <lts|version>" >&2
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
nvm install "$version"
