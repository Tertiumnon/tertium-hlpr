#!/bin/bash
# @description Fix permissions of ~/.ssh and its files for the current user

usage="Usage: hlpr ssh fix --permissions"

case "${1:-}" in
  -h|--help)
    echo "$usage"
    echo "Set ~/.ssh to 700, private keys and other files to 600, and public keys, config, and known_hosts to 644."
    exit 0
    ;;
esac

if [[ $# -ne 1 || "$1" != "--permissions" ]]; then
  echo "$usage" >&2
  exit 1
fi

if [[ ! -d ~/.ssh ]]; then
  echo "No ~/.ssh directory. Run: hlpr ssh setup" >&2
  exit 1
fi

chmod 700 ~/.ssh

# Private keys, authorized_keys, and backups must stay private; public files may be readable.
shopt -s nullglob dotglob
for file in ~/.ssh/*; do
  [[ -f "$file" ]] || continue
  case "$(basename "$file")" in
    *.pub|config|known_hosts|known_hosts.old) chmod 644 "$file" ;;
    *) chmod 600 "$file" ;;
  esac
done

echo "✓ Fixed permissions in ~/.ssh"
