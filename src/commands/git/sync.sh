#!/bin/bash
# @description Fetch all remotes, tags, and pruning information

if [[ $# -ne 0 ]]; then
  echo "Usage: hlpr git sync" >&2
  exit 1
fi

git fetch --all --tags --prune
