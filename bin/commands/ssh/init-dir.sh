#!/bin/bash
# @description Initialize SSH directory with proper permissions

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh

# Create files if they don't exist
touch ~/.ssh/known_hosts
touch ~/.ssh/config

# Set permissions (works on Unix/Linux/macOS and Git Bash on Windows)
chmod 700 ~/.ssh
chmod 644 ~/.ssh/known_hosts
chmod 644 ~/.ssh/config

echo "✓ SSH directory initialized at ~/.ssh"
