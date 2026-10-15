#!/bin/bash
# @description Create ~/.ssh with the permissions SSH requires

if [[ $# -ne 0 ]]; then
  echo "Usage: hlpr ssh setup" >&2
  exit 1
fi

# An existing ~/.ssh may hold keys, so ask before changing its permissions.
if [[ -d ~/.ssh ]]; then
  read -r -p "~/.ssh already exists. Set its permissions (700, and 644 for config and known_hosts)? [y/N] " answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo "No changes made."
    exit 0
  fi
fi

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh

# Create files if they don't exist
touch ~/.ssh/known_hosts
touch ~/.ssh/config

# Set permissions (works on Unix/Linux/macOS and Git Bash on Windows)
chmod 700 ~/.ssh
chmod 644 ~/.ssh/known_hosts
chmod 644 ~/.ssh/config

echo "✓ SSH directory set up at ~/.ssh"
